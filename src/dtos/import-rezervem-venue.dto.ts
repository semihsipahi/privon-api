import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ImportRezervemVenueDto {
  @ApiProperty({
    description: 'Bizim DB\'deki RestaurantCategory _id listesi',
    type: [String],
    example: ['64a1b2c3d4e5f6g7h8i9j0k1'],
  })
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @ApiProperty({ description: 'Fiyat seviyesi (1=₺, 2=₺₺, 3=₺₺₺, 4=₺₺₺₺)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  priceLevel: number;

  @ApiPropertyOptional({ description: 'Türkçe açıklama' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'İngilizce açıklama' })
  @IsOptional()
  @IsString()
  descriptionEng?: string;
}
