import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    IsMongoId,
    IsDateString,
    Min,
} from 'class-validator';

export class CreateReservationDto {
    @ApiProperty({ description: 'Slot ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    slot: string;

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
