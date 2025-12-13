import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RestaurantListQueryDto {
  @ApiPropertyOptional({
    description: 'Kategori ID ile filtrele',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'İndirim türü ile filtrele (PERCENTAGE/FIXED)',
    enum: ['PERCENTAGE', 'FIXED'],
  })
  @IsOptional()
  @IsString()
  discountType?: string;

  @ApiPropertyOptional({
    description: 'Kullanıcının enlem koordinatı (-90 ile 90 arası)',
    example: 41.0082,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  userLat?: number;

  @ApiPropertyOptional({
    description: 'Kullanıcının boylam koordinatı (-180 ile 180 arası)',
    example: 28.9784,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  userLon?: number;

  @ApiPropertyOptional({
    description: 'Sıralama türü (distance: uzaklığa göre, rating: puana göre)',
    enum: ['distance', 'rating'],
  })
  @IsOptional()
  @IsEnum(['distance', 'rating'])
  sortBy?: 'distance' | 'rating';

  @ApiPropertyOptional({
    description: 'Başlangıç index (0-tabanlı)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  _start?: number;

  @ApiPropertyOptional({
    description: 'Bitiş index (hariç)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  _end?: number;
}
