import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SlotFilterQueryDto {
  @ApiPropertyOptional({
    description: 'Rezervasyon tarihi (YYYY-MM-DD formatında)',
    example: '2025-12-25',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Kişi sayısı',
    example: 4,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  personCount?: number;
}
