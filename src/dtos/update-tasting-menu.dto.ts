import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTastingMenuDto } from './create-tasting-menu.dto';

export class UpdateTastingMenuDto extends PartialType(
  OmitType(CreateTastingMenuDto, ['restaurantId'] as const),
) {}
