import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FilterOption,
  FilterOptionSchema,
} from '../../models/filter-option.schema';
import { FilterOptionController } from './filter-option.controller';
import { FilterOptionService } from './filter-option.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FilterOption.name, schema: FilterOptionSchema },
    ]),
  ],
  controllers: [FilterOptionController],
  providers: [FilterOptionService],
  exports: [FilterOptionService],
})
export class FilterOptionModule {}
