import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Kategori adı', example: 'İtalyan' })
    @IsString()
    @IsNotEmpty()
    name: string;
}
