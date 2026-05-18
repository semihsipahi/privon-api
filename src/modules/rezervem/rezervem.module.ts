import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RezervemAuthService } from './rezervem-auth.service';
import { RezervemHttpService } from './rezervem-http.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { RezervemVenueService } from './rezervem-venue.service';
import { RezervemSyncController } from './rezervem-sync.controller';
import { RezervemVenue, RezervemVenueSchema } from '../../models/rezervem-venue.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: RezervemVenue.name, schema: RezervemVenueSchema },
    ]),
  ],
  controllers: [BookingController, RezervemSyncController],
  providers: [
    RezervemAuthService,
    RezervemHttpService,
    BookingService,
    RezervemVenueService,
  ],
  exports: [BookingService, RezervemHttpService, RezervemVenueService],
})
export class RezervemModule {}
