import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService, PaginatedResult } from './bookings.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PaginatedBookingsResponseDto } from './dto/paginated-bookings-response.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Booking } from './entities/booking.entity';

// No controller-level @UseGuards(JwtAuthGuard): POST /bookings must stay public
// (customers book without an account), so the guard is applied per-route below
// instead of once here.
@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking (public — no authentication required)',
  })
  @ApiCreatedResponse({ type: Booking })
  create(@Body() dto: CreateBookingDto): Promise<Booking> {
    return this.bookingsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List bookings (paginated, filterable by status, searchable)',
  })
  @ApiOkResponse({ type: PaginatedBookingsResponseDto })
  findAll(@Query() query: BookingQueryDto): Promise<PaginatedResult<Booking>> {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a booking by id' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ type: Booking })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transition a booking to a new status' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ type: Booking })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    return this.bookingsService.updateStatus(id, dto);
  }

  // DELETE is mapped to a business cancellation (status -> CANCELLED), not physical
  // row deletion — a booking is a business record (revenue, customer history,
  // audit trail) that should never disappear just because it was cancelled. Returns
  // 200 + the updated booking, not 204, since the resulting CANCELLED state is
  // meaningful information for the caller, not "no content".
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cancel a booking (sets status to CANCELLED; the row is never deleted)',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ type: Booking })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookingsService.cancel(id);
  }
}
