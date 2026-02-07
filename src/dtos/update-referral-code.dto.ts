import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateReferralCodeDto } from './create-referral-code.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ReferralCodeStatus } from 'src/common/enums/referral-code-status.enum';

export class UpdateReferralCodeDto extends PartialType(CreateReferralCodeDto) {
  @ApiProperty({ description: 'Kod durumu', enum: ReferralCodeStatus, required: false })
  @IsEnum(ReferralCodeStatus)
  @IsOptional()
  status?: ReferralCodeStatus;
}
