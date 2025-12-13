import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { Restaurant, RestaurantSchema } from '../../models/restaurant.schema';
import {
  DiscountSchedule,
  DiscountScheduleSchema,
} from '../../models/discount-schedule.schema';
import { Review, ReviewSchema } from '../../models/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: DiscountSchedule.name, schema: DiscountScheduleSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  providers: [RestaurantService],
  controllers: [RestaurantController],
  exports: [RestaurantService, MongooseModule],
})
export class RestaurantModule { }
