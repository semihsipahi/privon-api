import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsMongoId,
    IsOptional,
    Min,
    Max,
} from 'class-validator';

export class CreateReviewDto {
    @ApiProperty({
        description: 'Rezervasyon ID',
        example: '507f1f77bcf86cd799439011',
    })
    @IsMongoId()
    reservation: string;

    @ApiProperty({ description: 'Puan (1-5)', example: 5, minimum: 1, maximum: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ description: 'Yorum notu' })
    @IsOptional()
    @IsString()
    comment?: string;
}
