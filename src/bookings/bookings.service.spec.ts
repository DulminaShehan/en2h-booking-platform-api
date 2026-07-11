import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Service } from '../services/entities/service.entity';
import { BookingsService } from './bookings.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from './enums/booking-status.enum';

// A hand-rolled chainable stub covering only the QueryBuilder methods
// BookingsService actually calls — not an attempt to fake the whole
// SelectQueryBuilder API surface.
function createMockQueryBuilder() {
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  return qb;
}

type MockQueryBuilder = ReturnType<typeof createMockQueryBuilder>;

describe('BookingsService', () => {
  let bookingsService: BookingsService;
  let mockQueryBuilder: MockQueryBuilder;

  const mockBookingsRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockServicesRepository = {
    findOne: jest.fn(),
  };

  const buildService = (overrides: Partial<Service> = {}): Service => ({
    id: 'service-1',
    title: 'Haircut',
    duration: 30,
    price: 49.99,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const buildBooking = (overrides: Partial<Booking> = {}): Booking =>
    ({
      id: 'booking-1',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+1-555-0100',
      serviceId: 'service-1',
      bookingDateTime: new Date('2099-01-01T10:00:00Z'),
      status: BookingStatus.PENDING,
      notes: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Booking;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
        {
          provide: getRepositoryToken(Service),
          useValue: mockServicesRepository,
        },
      ],
    }).compile();

    bookingsService = module.get<BookingsService>(BookingsService);

    jest.clearAllMocks();
    mockQueryBuilder = createMockQueryBuilder();
    mockBookingsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('create', () => {
    const dto: CreateBookingDto = {
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+1-555-0100',
      serviceId: 'service-1',
      bookingDateTime: '2099-01-01T10:00:00Z',
    };

    it('creates a booking for an existing, active service with a future date', async () => {
      // Arrange
      mockServicesRepository.findOne.mockResolvedValue(buildService());
      mockQueryBuilder.getOne.mockResolvedValue(null); // no duplicate
      const created = buildBooking();
      mockBookingsRepository.create.mockReturnValue(created);
      mockBookingsRepository.save.mockResolvedValue(created);

      // Act
      const result = await bookingsService.create(dto);

      // Assert
      expect(result).toEqual(created);
      expect(mockBookingsRepository.save).toHaveBeenCalledWith(created);
    });

    it('throws NotFoundException when the service does not exist', async () => {
      mockServicesRepository.findOne.mockResolvedValue(null);

      await expect(bookingsService.create(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the service is inactive', async () => {
      mockServicesRepository.findOne.mockResolvedValue(
        buildService({ isActive: false }),
      );

      await expect(bookingsService.create(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a booking date in the past', async () => {
      mockServicesRepository.findOne.mockResolvedValue(buildService());

      await expect(
        bookingsService.create({
          ...dto,
          bookingDateTime: '2000-01-01T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a booking date exactly at the current instant', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2050-06-01T12:00:00Z'));
      mockServicesRepository.findOne.mockResolvedValue(buildService());

      await expect(
        bookingsService.create({
          ...dto,
          bookingDateTime: '2050-06-01T12:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      jest.useRealTimers();
    });

    it('throws ConflictException when an active booking already exists for the same service and time', async () => {
      mockServicesRepository.findOne.mockResolvedValue(buildService());
      mockQueryBuilder.getOne.mockResolvedValue(buildBooking()); // duplicate found

      await expect(bookingsService.create(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('always creates the booking with status PENDING, ignoring any status the caller supplies', async () => {
      mockServicesRepository.findOne.mockResolvedValue(buildService());
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockBookingsRepository.create.mockImplementation(
        (entity: Partial<Booking>) => entity,
      );
      mockBookingsRepository.save.mockImplementation((entity: Booking) =>
        Promise.resolve(entity),
      );

      // A malicious/confused caller trying to inject a different initial status —
      // CreateBookingDto has no `status` field, so this can only happen if
      // something bypasses the DTO type; the service must ignore it regardless.
      const maliciousDto = {
        ...dto,
        status: BookingStatus.CONFIRMED,
      } as CreateBookingDto;

      const result = await bookingsService.create(maliciousDto);

      expect(result.status).toBe(BookingStatus.PENDING);
    });

    it('converts a Postgres unique-violation error (race-condition duplicate) into ConflictException', async () => {
      mockServicesRepository.findOne.mockResolvedValue(buildService());
      mockQueryBuilder.getOne.mockResolvedValue(null); // pre-check sees no duplicate...
      mockBookingsRepository.create.mockReturnValue(buildBooking());
      // ...but the INSERT itself hits the partial unique index because another
      // request won the race between the pre-check and this save().
      mockBookingsRepository.save.mockRejectedValue({ code: '23505' });

      await expect(bookingsService.create(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('does not mask unrelated database errors as a duplicate-booking conflict', async () => {
      mockServicesRepository.findOne.mockResolvedValue(buildService());
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockBookingsRepository.create.mockReturnValue(buildBooking());
      const unrelatedError = new Error('connection terminated');
      mockBookingsRepository.save.mockRejectedValue(unrelatedError);

      await expect(bookingsService.create(dto)).rejects.toThrow(
        'connection terminated',
      );
    });
  });

  describe('findAll', () => {
    const baseQuery: BookingQueryDto = { page: 1, limit: 10 };

    it('applies default pagination (page 1, limit 10)', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await bookingsService.findAll(baseQuery);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('applies a custom page and limit as an offset', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await bookingsService.findAll({ page: 3, limit: 20 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40); // (3-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('filters by status only when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await bookingsService.findAll({
        ...baseQuery,
        status: BookingStatus.CONFIRMED,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'booking.status = :status',
        { status: BookingStatus.CONFIRMED },
      );
    });

    it('does not filter by status when none is provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await bookingsService.findAll(baseQuery);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.anything(),
      );
    });

    it('searches customerName OR customerEmail (case-insensitively) when search is provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await bookingsService.findAll({ ...baseQuery, search: 'jane' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%jane%' },
      );
    });

    it('returns an empty result set with zero totals when there are no matches', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await bookingsService.findAll(baseQuery);

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it('computes pagination metadata correctly for a partial last page', async () => {
      const bookings = [buildBooking()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([bookings, 25]);

      const result = await bookingsService.findAll({ page: 1, limit: 10 });

      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(result.data).toEqual(bookings);
    });
  });

  describe('findOne', () => {
    it('returns the booking (with its service relation) when found', async () => {
      const booking = buildBooking();
      mockBookingsRepository.findOne.mockResolvedValue(booking);

      const result = await bookingsService.findOne('booking-1');

      expect(mockBookingsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        relations: { service: true },
      });
      expect(result).toEqual(booking);
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(null);

      await expect(bookingsService.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus (state machine)', () => {
    const validTransitions: [BookingStatus, BookingStatus][] = [
      [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      [BookingStatus.PENDING, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    ];

    it.each(validTransitions)('allows %s -> %s', async (from, to) => {
      const booking = buildBooking({ status: from });
      mockBookingsRepository.findOne.mockResolvedValue(booking);
      mockBookingsRepository.save.mockImplementation((entity: Booking) =>
        Promise.resolve(entity),
      );

      const result = await bookingsService.updateStatus('booking-1', {
        status: to,
      });

      expect(result.status).toBe(to);
      expect(mockBookingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: to }),
      );
    });

    const invalidTransitions: [BookingStatus, BookingStatus][] = [
      [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
      [BookingStatus.CANCELLED, BookingStatus.CONFIRMED],
      [BookingStatus.CANCELLED, BookingStatus.PENDING],
      [BookingStatus.COMPLETED, BookingStatus.PENDING],
      [BookingStatus.COMPLETED, BookingStatus.CONFIRMED],
      [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    ];

    it.each(invalidTransitions)(
      'rejects %s -> %s with BadRequestException and does not save',
      async (from, to) => {
        const booking = buildBooking({ status: from });
        mockBookingsRepository.findOne.mockResolvedValue(booking);

        await expect(
          bookingsService.updateStatus('booking-1', { status: to }),
        ).rejects.toThrow(BadRequestException);
        expect(mockBookingsRepository.save).not.toHaveBeenCalled();
      },
    );

    it('rejects a same-state transition with BadRequestException and does not save', async () => {
      const booking = buildBooking({ status: BookingStatus.PENDING });
      mockBookingsRepository.findOne.mockResolvedValue(booking);

      await expect(
        bookingsService.updateStatus('booking-1', {
          status: BookingStatus.PENDING,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(null);

      await expect(
        bookingsService.updateStatus('missing-id', {
          status: BookingStatus.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a PENDING booking, setting its status to CANCELLED', async () => {
      const booking = buildBooking({ status: BookingStatus.PENDING });
      mockBookingsRepository.findOne.mockResolvedValue(booking);
      mockBookingsRepository.save.mockImplementation((entity: Booking) =>
        Promise.resolve(entity),
      );

      const result = await bookingsService.cancel('booking-1');

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('cancels a CONFIRMED booking, setting its status to CANCELLED', async () => {
      const booking = buildBooking({ status: BookingStatus.CONFIRMED });
      mockBookingsRepository.findOne.mockResolvedValue(booking);
      mockBookingsRepository.save.mockImplementation((entity: Booking) =>
        Promise.resolve(entity),
      );

      const result = await bookingsService.cancel('booking-1');

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('rejects cancelling an already-CANCELLED booking with BadRequestException', async () => {
      const booking = buildBooking({ status: BookingStatus.CANCELLED });
      mockBookingsRepository.findOne.mockResolvedValue(booking);

      await expect(bookingsService.cancel('booking-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects cancelling a COMPLETED booking with BadRequestException', async () => {
      const booking = buildBooking({ status: BookingStatus.COMPLETED });
      mockBookingsRepository.findOne.mockResolvedValue(booking);

      await expect(bookingsService.cancel('booking-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBookingsRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(null);

      await expect(bookingsService.cancel('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('never physically deletes the booking row — cancel() only ever calls repository.save()', async () => {
      const booking = buildBooking({ status: BookingStatus.PENDING });
      mockBookingsRepository.findOne.mockResolvedValue(booking);
      mockBookingsRepository.save.mockImplementation((entity: Booking) =>
        Promise.resolve(entity),
      );

      await bookingsService.cancel('booking-1');

      // The repository mock exposes no delete/remove method at all — if cancel()
      // ever called one, this would fail with "not a function" rather than
      // silently pass, which is what actually proves no deletion happens.
      expect(mockBookingsRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
