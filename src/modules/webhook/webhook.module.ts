import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { User, UserSchema } from '../../models/user.schema';
import { Reservation, ReservationSchema } from '../../models/reservation.schema';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Reservation.name, schema: ReservationSchema },
        ]),
        ConfigModule,
        UserModule,
    ],
    controllers: [WebhookController],
    providers: [WebhookService],
})
export class WebhookModule { }
