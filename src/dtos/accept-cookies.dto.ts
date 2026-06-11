import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

export class AcceptCookiesDto {
  @ApiProperty({ description: 'Çerez Politikası onayı', example: true })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ description: 'Çerez Politikası versiyonu', example: 1 })
  @IsNumber()
  version: number;

  @ApiProperty({
    description: 'Çerez tercihleri',
    example: ['necessary', 'analytics'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  preferences: string[];
}
