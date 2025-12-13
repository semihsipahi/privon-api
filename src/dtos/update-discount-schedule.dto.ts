import { PartialType } from '@nestjs/swagger';
import { CreateDiscountScheduleDto } from './create-discount-schedule.dto';

export class UpdateDiscountScheduleDto extends PartialType(
    CreateDiscountScheduleDto,
) { }
