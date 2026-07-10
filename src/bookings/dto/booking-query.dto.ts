import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum';

export class BookingQueryDto {
  // Query string values arrive as strings ("1", not 1) — @Type(() => Number) runs
  // class-transformer's conversion before class-validator's @IsInt checks the result,
  // which is why ValidationPipe must have `transform: true` (already set in main.ts).
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Case-insensitive search over customerName and customerEmail',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
