import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({
        description: 'Full name of the user',
        example: 'Ahmet Yılmaz',
        required: false,
    })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({
        description: 'Profile image URL',
        example: 'https://example.com/image.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiProperty({
        description: 'Email address',
        example: 'user@example.com',
        required: false,
    })
    @IsOptional()
    @IsString()
    email?: string;
}
