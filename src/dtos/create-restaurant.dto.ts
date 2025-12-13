import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiPropertyOptional({ description: 'Restoran adresi' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'GeoJSON koordinatları [longitude, latitude]',
    example: [28.9784, 41.0082],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  coordinates?: number[];
}

export class WorkingHoursDto {
  @ApiPropertyOptional({ description: 'Gün ismi', example: 'Pazartesi' })
  @IsString()
  @IsOptional()
  dayName?: string;

  @ApiPropertyOptional({ description: 'Açılış saati', example: '09:00' })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Kapanış saati', example: '22:00' })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiPropertyOptional({ description: 'Kapalı mı?', default: false })
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}

export class CreateRestaurantDto {
  @ApiPropertyOptional({ description: 'Restoran sahibi (User ID)' })
  @IsMongoId()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ description: 'Restoran ismi' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Restoran resimleri (URL dizisi)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Restoran kategorisi ID' })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Restoran konumu', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @ApiPropertyOptional({ description: 'Website' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Telefon' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'E-posta' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Menü metni' })
  @IsString()
  @IsOptional()
  menu?: string;

  @ApiPropertyOptional({
    description: 'Çalışma saatleri',
    type: [WorkingHoursDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto[];

  @ApiPropertyOptional({ description: 'Feed videoları (URL dizisi)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  feedVideos?: string[];
}
