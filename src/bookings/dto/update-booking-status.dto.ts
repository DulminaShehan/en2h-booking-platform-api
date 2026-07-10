import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
    description:
      "Target status. Must be a valid transition from the booking's current status " +
      '(see BookingsService.ALLOWED_TRANSITIONS) — e.g. PENDING -> CONFIRMED is valid, ' +
      'CANCELLED -> anything is not.',
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
