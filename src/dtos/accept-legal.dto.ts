import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AcceptLegalDto {
  @ApiProperty({ description: 'Kullanım Şartları onayı', example: true })
  @IsBoolean()
  acceptedTerms: boolean;

  @ApiProperty({ description: 'Aydınlatma Metni onayı', example: true })
  @IsBoolean()
  acceptedPrivacy: boolean;

  @ApiProperty({ description: 'Pazarlama iletişim izni (opsiyonel)', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  acceptedMarketing?: boolean;
}
