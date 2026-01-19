import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Kategori adı', example: 'İtalyan' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Kategori resmi', example: 'https://example.com/image.png', required: false })
    @IsString()
    @IsOptional()
    image?: string;

    @ApiProperty({ description: 'Kategori rengi', example: '#FF5733', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Ana sayfada görünsün mü?', example: true, required: false })
    @IsBoolean()
    @IsOptional()
    visibleOnHomePage?: boolean;

    @ApiProperty({ description: 'Sıralama', example: 1, required: false })
    @IsOptional()
    order?: number;
}
