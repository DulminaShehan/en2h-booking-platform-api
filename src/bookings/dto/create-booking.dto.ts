import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'Jane Doe', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName: string;

  @ApiProperty({ example: 'jane@example.com', maxLength: 200 })
  @IsEmail()
  @MaxLength(200)
  customerEmail: string;

  // Never @Type(() => Number) / @IsNumber() here — phone numbers routinely have
  // leading zeros, "+" country prefixes, and extensions a numeric type would corrupt.
  @ApiProperty({ example: '+1-555-0100', maxLength: 30 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  customerPhone: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Must reference an existing, active Service',
  })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: '2026-07-15T10:30:00+05:30',
    description:
      'ISO 8601 date-time, strictly in the future. Include a timezone offset (or "Z") — ' +
      'this is stored as a Postgres timestamptz, i.e. an absolute instant.',
  })
  @IsISO8601()
  @IsFutureDate()
  bookingDateTime: string;

  @ApiPropertyOptional({
    example: 'Please call 10 minutes before arrival.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
