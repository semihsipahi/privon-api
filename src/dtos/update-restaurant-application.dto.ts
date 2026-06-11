import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-restaurant-application.dto';

export class UpdateRestaurantApplicationDto extends PartialType(
  CreateApplicationDto,
) {}
