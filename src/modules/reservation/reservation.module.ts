import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from '../../models/reservation.schema';
import { Slot, SlotSchema } from '../../models/slot.schema';
import { User, UserSchema } from '../../models/user.schema';
import { Restaurant, RestaurantSchema } from '../../models/restaurant.schema';
import { DelayedNotificationJob, DelayedNotificationJobSchema } from '../../models/delayed-notification-job.schema';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Reservation.name, schema: ReservationSchema },
            { name: Slot.name, schema: SlotSchema },
            { name: User.name, schema: UserSchema },
            { name: Restaurant.name, schema: RestaurantSchema },
            { name: DelayedNotificationJob.name, schema: DelayedNotificationJobSchema }
        ]),
        MailModule,
        NotificationModule,
    ],
    controllers: [ReservationController],
    providers: [ReservationService],
    exports: [ReservationService],
})
export class ReservationModule { }
