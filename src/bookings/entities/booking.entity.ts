import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity('bookings')
// Partial unique index: enforces "no two non-cancelled bookings for the same service
// at the same instant" at the database level, not just in application code. A plain
// UNIQUE(serviceId, bookingDateTime) would permanently block that slot even after the
// conflicting booking is cancelled — the WHERE clause scopes the constraint to active
// bookings only, so a cancelled booking frees the slot back up. This is also what
// closes the race-condition window a service-layer-only check can't (see
// BookingsService#create).
@Index(
  'IDX_bookings_service_datetime_active',
  ['serviceId', 'bookingDateTime'],
  {
    unique: true,
    where: `"status" != 'CANCELLED'`,
  },
)
export class Booking {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Column({ length: 200 })
  customerName: string;

  @ApiProperty({ example: 'jane@example.com' })
  @Column({ length: 200 })
  customerEmail: string;

  // Stored as varchar, never a numeric type — phone numbers routinely have leading
  // zeros, `+` prefixes, and extensions that a numeric column would corrupt or reject.
  @ApiProperty({ example: '+1-555-0100' })
  @Column({ length: 30 })
  customerPhone: string;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column('uuid')
  serviceId: string;

  // onDelete: 'RESTRICT' — deleting a Service that still has bookings fails loudly
  // with a FK violation instead of silently cascading and wiping booking history.
  @ManyToOne(() => Service, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  // timestamptz: Postgres stores this as an absolute UTC instant and converts to/from
  // the session timezone on read/write, so comparisons are always instant-vs-instant
  // regardless of what timezone offset the client sent — never a formatted local string.
  @ApiProperty({ example: '2026-07-15T10:30:00+05:30' })
  @Index()
  @Column({ type: 'timestamptz' })
  bookingDateTime: Date;

  @ApiProperty({ enum: BookingStatus, default: BookingStatus.PENDING })
  @Index()
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
