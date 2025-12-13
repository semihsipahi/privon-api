import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class ClaimSlotDto {
    @ApiProperty({ description: 'İndirim programı ID' })
    @IsMongoId()
    scheduleId: string;

    @ApiProperty({ description: 'Restoran ID' })
    @IsMongoId()
    restaurantId: string;

    @ApiProperty({
        description: 'Rezervasyon tarihi',
        example: '2024-12-09',
    })
    @IsDateString()
    reservationDate: string;

    @ApiProperty({
        description: 'Slot başlangıç saati',
        example: '14:00',
    })
    @IsString()
    slotStartTime: string;

    @ApiProperty({ description: 'Kişi sayısı', example: 4 })
    @IsNumber()
    @Min(1)
    guestCount: number;
}
