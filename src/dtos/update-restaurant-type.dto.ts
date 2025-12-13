import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantTypeDto } from './create-restaurant-type.dto';

export class UpdateRestaurantTypeDto extends PartialType(CreateRestaurantTypeDto) {}
