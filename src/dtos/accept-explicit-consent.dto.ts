import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';

export class AcceptExplicitConsentDto {
  @ApiProperty({ description: 'Açık Rıza Metni onayı', example: true })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ description: 'Açık Rıza Metni versiyonu', example: 1 })
  @IsNumber()
  version: number;
}
