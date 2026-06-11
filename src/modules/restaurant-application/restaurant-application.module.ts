import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantApplicationController } from './restaurant-application.controller';
import { RestaurantApplicationService } from './restaurant-application.service';
import {
  RestaurantApplication,
  RestaurantApplicationSchema,
} from '../../models/restaurant-application.schema';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';
import { RestaurantModule } from '../restaurant/restaurant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantApplication.name, schema: RestaurantApplicationSchema },
    ]),
    UserModule,
    MailModule,
    RestaurantModule,
  ],
  controllers: [RestaurantApplicationController],
  providers: [RestaurantApplicationService],
  exports: [RestaurantApplicationService],
})
export class RestaurantApplicationModule {}
