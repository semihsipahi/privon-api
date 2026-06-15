import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CityService } from './city.service';
import { CityController } from './city.controller';
import { City, CitySchema } from '../../models/city.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: City.name, schema: CitySchema }]),
  ],
  providers: [CityService],
  controllers: [CityController],
  exports: [CityService, MongooseModule],
})
export class CityModule {}
