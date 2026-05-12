import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RestaurantListQueryDto {
  @ApiPropertyOptional({
    description: 'Restoran adına göre arama',
    example: 'pizza',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Kategori ID listesi ile filtrele (virgülle ayrılmış)',
    example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({
    description: 'İndirim oranına göre filtrele (örn: 50 = %50 indirimli slotlar)',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({
    description: 'Fiyat seviyesine göre filtrele (1: Ucuz, 2: Orta, 3: Pahalı)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceLevel?: number;

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
    description: 'Maksimum mesafe (metre cinsinden, harita görünümü için)',
    example: 5000,
    minimum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Sıralama türü (varsayılan: distance)',
    enum: ['distance', 'rating'],
    default: 'distance',
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

  @ApiPropertyOptional({
    description: 'Tarih (YYYY-MM-DD) - Gönderilmezse bugün (UTC+3) kullanılır',
    example: '2026-01-09',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tarih YYYY-MM-DD formatında olmalıdır' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Mutfak türlerine göre filtrele (virgülle ayrılmış)',
    example: 'italian,french',
  })
  @IsOptional()
  @IsString()
  cuisineTypes?: string;

  @ApiPropertyOptional({
    description: 'Atmosfer türlerine göre filtrele (virgülle ayrılmış)',
    example: 'romantic,seaside',
  })
  @IsOptional()
  @IsString()
  atmosphereTypes?: string;

  @ApiPropertyOptional({
    description: 'Koleksiyon türlerine göre filtrele (virgülle ayrılmış)',
    example: 'michelinGuide,chefRestaurant',
  })
  @IsOptional()
  @IsString()
  collectionTypes?: string;

}
