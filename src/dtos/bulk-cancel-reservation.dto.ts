import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class BulkCancelReservationDto {
  @ApiProperty({ example: '659c1b2c4f1a2c001f8e1a2b' })
  @IsNotEmpty()
  @IsString()
  restaurantId: string;

  @ApiProperty({ example: '2024-01-21' })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
