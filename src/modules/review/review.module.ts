import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { Review, ReviewSchema } from '../../models/review.schema';
import {
  SlotReservation,
  SlotReservationSchema,
} from '../../models/slot-reservation.schema';
import { Restaurant, RestaurantSchema } from '../../models/restaurant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: SlotReservation.name, schema: SlotReservationSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule { }
