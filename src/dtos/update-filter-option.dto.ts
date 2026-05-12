import { PartialType } from '@nestjs/swagger';
import { CreateFilterOptionDto } from './create-filter-option.dto';

export class UpdateFilterOptionDto extends PartialType(CreateFilterOptionDto) {}
