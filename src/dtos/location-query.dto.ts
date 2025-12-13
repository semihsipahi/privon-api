import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationQueryDto {
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
}
