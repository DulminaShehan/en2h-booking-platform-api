import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../services/entities/service.entity';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Postgres error code for a unique/exclusion constraint violation — used to translate
// the partial unique index's race-condition rejection into a clean 409 instead of a
// raw driver error leaking out of the API.
const POSTGRES_UNIQUE_VIOLATION = '23505';

// Explicit transition map instead of scattered if/else — the whole state machine is
// readable at a glance, and both updateStatus() and cancel() consult this single
// source of truth so they can't drift out of sync with each other.
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const service = await this.servicesRepository.findOne({
      where: { id: dto.serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Service ${dto.serviceId} not found`);
    }
    if (!service.isActive) {
      throw new BadRequestException('Cannot book an inactive service');
    }

    const bookingDateTime = new Date(dto.bookingDateTime);
    // Re-check even though CreateBookingDto's @IsFutureDate() already validated this:
    // time passes between that validation and this line (network, other middleware,
    // event-loop scheduling), so a value that was future at validation time could
    // already be past by the time we're about to persist it.
    if (bookingDateTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'bookingDateTime must be strictly in the future',
      );
    }

    // Layer 1 of 2: a fast pre-check that gives a clean error for the common case.
    // This alone has a race window — see the catch block below for layer 2.
    const duplicate = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.serviceId = :serviceId', { serviceId: dto.serviceId })
      .andWhere('booking.bookingDateTime = :bookingDateTime', {
        bookingDateTime,
      })
      .andWhere('booking.status != :cancelled', {
        cancelled: BookingStatus.CANCELLED,
      })
      .getOne();
    if (duplicate) {
      throw new ConflictException(
        'An active booking already exists for this service at this date and time',
      );
    }

    const booking = this.bookingsRepository.create({
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      serviceId: dto.serviceId,
      bookingDateTime,
      notes: dto.notes,
      // Never trust a client-supplied status — every booking starts PENDING
      // regardless of anything else in the request body.
      status: BookingStatus.PENDING,
    });

    try {
      return await this.bookingsRepository.save(booking);
    } catch (error) {
      // Layer 2: if two requests raced past the SELECT above at the same time, the
      // partial unique index (see Booking entity) rejects the second INSERT at the
      // database level. Translate that into the same 409 instead of a raw 500.
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'An active booking already exists for this service at this date and time',
        );
      }
      throw error;
    }
  }

  async findAll(query: BookingQueryDto): Promise<PaginatedResult<Booking>> {
    const { page, limit, status, search } = query;

    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    if (search) {
      // ILIKE is Postgres's case-insensitive LIKE; values are bound as query
      // parameters (never string-concatenated), so this is safe from SQL injection.
      qb.andWhere(
        '(booking.customerName ILIKE :search OR booking.customerEmail ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { service: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Same-state transitions are rejected rather than treated as a silent no-op — an
    // explicit 400 tells the caller their request didn't do what they probably
    // expected, instead of returning 200 with a booking that didn't actually change.
    if (booking.status === dto.status) {
      throw new BadRequestException(`Booking is already ${dto.status}`);
    }

    if (!ALLOWED_TRANSITIONS[booking.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition booking from ${booking.status} to ${dto.status}`,
      );
    }

    booking.status = dto.status;
    return this.bookingsRepository.save(booking);
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Consults the same ALLOWED_TRANSITIONS map as updateStatus() rather than a
    // separate hardcoded check, so COMPLETED (and any future terminal status) is
    // rejected here for free without needing to remember to update two places.
    if (
      !ALLOWED_TRANSITIONS[booking.status].includes(BookingStatus.CANCELLED)
    ) {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status.toLowerCase()} booking`,
      );
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookingsRepository.save(booking);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
