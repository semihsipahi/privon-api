import { IsArray, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ImportRezervemVenueDto {
  @ApiProperty({ type: [String], example: ['64a1b2c3d4e5f6g7h8i9j0k1'] })
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  priceLevel: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'MinIO\'ya yüklenmiş görsel URL listesi', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEng?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  awards?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineTypes?: string[];
}
