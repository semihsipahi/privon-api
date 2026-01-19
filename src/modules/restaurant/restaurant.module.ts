import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { Restaurant, RestaurantSchema } from '../../models/restaurant.schema';
import { Reservation, ReservationSchema } from '../../models/reservation.schema';
import { Review, ReviewSchema } from '../../models/review.schema';
import { UserModule } from '../user/user.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    UserModule,
  ],
  providers: [RestaurantService],
  controllers: [RestaurantController],
  exports: [RestaurantService, MongooseModule],
})
export class RestaurantModule { }
