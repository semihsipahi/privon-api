import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscountSlotController } from './discount-slot.controller';
import { DiscountSlotService } from './discount-slot.service';
import {
    DiscountSchedule,
    DiscountScheduleSchema,
} from '../../models/discount-schedule.schema';
import {
    SlotReservation,
    SlotReservationSchema,
} from '../../models/slot-reservation.schema';
import { Restaurant, RestaurantSchema } from '../../models/restaurant.schema';
import { User, UserSchema } from '../../models/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DiscountSchedule.name, schema: DiscountScheduleSchema },
            { name: SlotReservation.name, schema: SlotReservationSchema },
            { name: Restaurant.name, schema: RestaurantSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [DiscountSlotController],
    providers: [DiscountSlotService],
    exports: [DiscountSlotService],
})
export class DiscountSlotModule { }

