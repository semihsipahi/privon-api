import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantApplicationController } from './restaurant-application.controller';
import { RestaurantApplicationService } from './restaurant-application.service';
import { RestaurantApplication, RestaurantApplicationSchema } from '../../models/restaurant-application.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: RestaurantApplication.name, schema: RestaurantApplicationSchema }]),
    ],
    controllers: [RestaurantApplicationController],
    providers: [RestaurantApplicationService],
    exports: [RestaurantApplicationService],
})
export class RestaurantApplicationModule { }
