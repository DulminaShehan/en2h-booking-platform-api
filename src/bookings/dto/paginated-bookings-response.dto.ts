import { ApiProperty } from '@nestjs/swagger';
import { Booking } from '../entities/booking.entity';

class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedBookingsResponseDto {
  @ApiProperty({ type: [Booking] })
  data: Booking[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
