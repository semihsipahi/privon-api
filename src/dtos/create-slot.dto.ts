import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsArray,
    IsNumber,
    IsMongoId,
    Min,
    ArrayMinSize,
    Matches,
    IsOptional,
} from 'class-validator';

export class CreateSlotDto {
    @ApiProperty({ description: 'Restoran ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    restaurant: string;

    @ApiProperty({
        description: 'Slot saati (HH:mm formatında)',
        example: '12:00',
    })
    @IsString()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Saat HH:mm formatında olmalıdır (örn: 12:00, 09:30)',
    })
    time: string;

    @ApiProperty({ description: 'Minimum kişi sayısı', example: 2, minimum: 1 })
    @IsNumber()
    @Min(1)
    minPersons: number;

    @ApiProperty({ description: 'Maksimum kişi sayısı', example: 8, minimum: 1 })
    @IsNumber()
    @Min(1)
    maxPersons: number;

    @ApiProperty({ description: 'Masa kotası', example: 5, minimum: 1 })
    @IsNumber()
    @Min(1)
    tableQuota: number;

    @ApiProperty({
        description: 'İndirim yüzdesi',
        example: 30,
    })
    @IsNumber()
    discount: number;

    @ApiProperty({
        description: 'Slot geçerli günler (0=Pazartesi, 6=Pazar)',
        example: [0, 1, 2, 3, 4],
        type: [Number],
    })
    @IsArray()
    @IsNumber({}, { each: true })
    @ArrayMinSize(1)
    days: number[];
}
