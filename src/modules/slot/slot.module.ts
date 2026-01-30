import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Slot, SlotSchema } from '../../models/slot.schema';
import { Reservation, ReservationSchema } from '../../models/reservation.schema';
import { SlotController } from './slot.controller';
import { SlotService } from './slot.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Slot.name, schema: SlotSchema },
            { name: Reservation.name, schema: ReservationSchema },
        ]),
    ],
    controllers: [SlotController],
    providers: [SlotService],
    exports: [SlotService],
})
export class SlotModule {}
