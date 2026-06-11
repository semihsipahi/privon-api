import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';

export class AcceptCommercialConsentDto {
  @ApiProperty({ description: 'Ticari Elektronik İleti Onayı', example: true })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ description: 'Ticari Elektronik İleti Onayı versiyonu', example: 1 })
  @IsNumber()
  version: number;
}
