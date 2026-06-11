import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFilterOptionDto {
  @ApiProperty({ description: 'Filtre türü', enum: ['cuisine', 'atmosphere'] })
  @IsEnum(['cuisine', 'atmosphere'], {
    message: 'Tür cuisine veya atmosphere olmalıdır',
  })
  type: 'cuisine' | 'atmosphere';

  @ApiProperty({
    description: 'API filtre anahtarı (slug)',
    example: 'italian',
  })
  @IsString({ message: 'Value metin formatında olmalıdır' })
  value: string;

  @ApiProperty({
    description: 'Ekranda gösterilecek ad (Türkçe)',
    example: 'İtalyan',
  })
  @IsString({ message: 'Label metin formatında olmalıdır' })
  label: string;

  @ApiPropertyOptional({
    description: 'Ekranda gösterilecek ad (İngilizce)',
    example: 'Italian',
  })
  @IsString({ message: 'LabelEn metin formatında olmalıdır' })
  @IsOptional()
  labelEn?: string;

  @ApiPropertyOptional({ description: 'Aktif mi?', default: true })
  @IsBoolean({ message: 'isActive boolean olmalıdır' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sıra', default: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'order sayı olmalıdır' })
  @IsOptional()
  order?: number;
}
