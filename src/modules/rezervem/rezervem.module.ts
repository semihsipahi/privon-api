import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RezervemAuthService } from './rezervem-auth.service';
import { RezervemHttpService } from './rezervem-http.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BookingController],
  providers: [RezervemAuthService, RezervemHttpService, BookingService],
  exports: [BookingService, RezervemHttpService],
})
export class RezervemModule {}
