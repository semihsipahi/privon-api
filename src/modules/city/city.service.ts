import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { City } from '../../models/city.schema';
import { CreateCityDto } from 'src/dtos/create-city.dto';
import { UpdateCityDto } from 'src/dtos/update-city.dto';
import { ResourceService } from 'src/services/resource.service';

@Injectable()
export class CityService extends ResourceService<
  City,
  CreateCityDto,
  UpdateCityDto
> {
  constructor(
    @InjectModel(City.name)
    private cityModel: Model<City>,
  ) {
    super(cityModel);
  }

  async getCities(params: {
    isCapital?: boolean;
    isDestination?: boolean;
  }): Promise<City[]> {
    const filter: Record<string, boolean> = {};
    if (params.isCapital !== undefined) filter.isCapital = params.isCapital;
    if (params.isDestination !== undefined)
      filter.isDestination = params.isDestination;

    const cities = await this.cityModel
      .find(Object.keys(filter).length > 0 ? filter : {})
      .sort({ isCapital: -1, name: 1 })
      .lean();

    return cities as unknown as City[];
  }
}
