import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from '../../models/notification.schema';
import { NotificationStatus, NotificationStatusSchema } from '../../models/notification-status.schema';
import { User, UserSchema } from '../../models/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema },
            { name: NotificationStatus.name, schema: NotificationStatusSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
