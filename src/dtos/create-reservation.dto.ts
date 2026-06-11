import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsMongoId,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiPropertyOptional({
    description: 'Slot ID (direct bookings only)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  slot?: string;

  @ApiProperty({
    description: 'Rezervasyon tarihi (YYYY-MM-DD)',
    example: '2025-12-25',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Kişi sayısı', example: 4, minimum: 1 })
  @IsNumber()
  @Min(1)
  personCount: number;
}
