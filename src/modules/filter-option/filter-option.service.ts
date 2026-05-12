import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilterOption } from '../../models/filter-option.schema';
import { CreateFilterOptionDto } from 'src/dtos/create-filter-option.dto';
import { UpdateFilterOptionDto } from 'src/dtos/update-filter-option.dto';
import { ResourceService } from 'src/services/resource.service';

@Injectable()
export class FilterOptionService extends ResourceService<
  FilterOption,
  CreateFilterOptionDto,
  UpdateFilterOptionDto
> {
  constructor(
    @InjectModel(FilterOption.name)
    private filterOptionModel: Model<FilterOption>,
  ) {
    super(filterOptionModel);
  }

  async list(query: any) {
    if (!query._sort) {
      query._sort = 'order';
      query._order = 'asc';
    }
    return super.list(query);
  }

  async getGroupedOptions(): Promise<{ cuisine: FilterOption[]; atmosphere: FilterOption[] }> {
    const options = await this.filterOptionModel
      .find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    return {
      cuisine: options.filter((o) => o.type === 'cuisine'),
      atmosphere: options.filter((o) => o.type === 'atmosphere'),
    };
  }
}
