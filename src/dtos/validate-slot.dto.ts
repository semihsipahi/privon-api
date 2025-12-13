import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class ValidateSlotDto {
    @ApiProperty({
        description: 'Rezervasyon kodu (QR kod)',
        example: 'ABC12345',
    })
    @IsString()
    reservationCode: string;

    @ApiProperty({
        description: 'Sipariş tutarı (TL)',
        example: 500,
    })
    @IsNumber()
    @Min(0)
    orderAmount: number;
}
