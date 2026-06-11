import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class AcceptLegalV2Dto {
  @ApiProperty({ description: 'Kullanım Şartları onayı', example: true })
  @IsBoolean()
  acceptedTerms: boolean;

  @ApiProperty({ description: 'Kullanım Şartları versiyonu', example: 1 })
  @IsNumber()
  acceptedTermsVersion: number;

  @ApiProperty({ description: 'Aydınlatma Metni onayı', example: true })
  @IsBoolean()
  acceptedPrivacy: boolean;

  @ApiProperty({ description: 'Aydınlatma Metni versiyonu', example: 1 })
  @IsNumber()
  acceptedPrivacyVersion: number;

  @ApiProperty({ description: 'Pazarlama iletişim izni (opsiyonel)', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  acceptedMarketing?: boolean;
}
