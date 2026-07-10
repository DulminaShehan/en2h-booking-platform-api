import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../services/entities/service.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';

@Module({
  // Service repository is needed here too — BookingsService looks up a Service by
  // id (existence + isActive) when creating a booking. This reuses the existing
  // Service entity directly rather than importing ServicesModule, since we only
  // need repository access, not ServicesService's business logic.
  imports: [TypeOrmModule.forFeature([Booking, Service])],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
