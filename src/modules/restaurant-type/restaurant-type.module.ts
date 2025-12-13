import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantTypeService } from './restaurant-type.service';
import { RestaurantTypeController } from './restaurant-type.controller';
import {
  RestaurantType,
  RestaurantTypeSchema,
} from '../../models/restaurant-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantType.name, schema: RestaurantTypeSchema },
    ]),
  ],
  providers: [RestaurantTypeService],
  controllers: [RestaurantTypeController],
  exports: [RestaurantTypeService, MongooseModule],
})
export class RestaurantTypeModule {}
