import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from '../../models/reservation.schema';
import { Slot, SlotSchema } from '../../models/slot.schema';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Reservation.name, schema: ReservationSchema },
            { name: Slot.name, schema: SlotSchema },
        ]),
    ],
    controllers: [ReservationController],
    providers: [ReservationService],
    exports: [ReservationService],
})
export class ReservationModule { }
