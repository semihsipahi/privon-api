import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetCategoriesDto {
  @ApiPropertyOptional({ description: 'Arama metni' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Ana sayfada görünenler' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  visibleOnHomePage?: boolean;

  @ApiPropertyOptional({ description: 'Başlangıç index' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  _start?: number;

  @ApiPropertyOptional({ description: 'Bitiş index' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  _end?: number;

  @ApiPropertyOptional({ description: 'Sıralama alanı' })
  @IsOptional()
  @IsString()
  _sort?: string;

  @ApiPropertyOptional({ description: 'Sıralama yönü', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  _order?: 'asc' | 'desc';
}
