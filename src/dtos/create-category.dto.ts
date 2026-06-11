import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Kategori adı (Türkçe)', example: 'İtalyan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Kategori adı (İngilizce)',
    example: 'Italian',
    required: false,
  })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiProperty({
    description: 'Kategori açıklaması (Türkçe)',
    example: 'Dünyanın en prestijli rehberi.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Kategori açıklaması (İngilizce)',
    example: "The world's most prestigious guide.",
    required: false,
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Ana sayfada görünsün mü?',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  visibleOnHomePage?: boolean;

  @ApiProperty({ description: 'Sıralama', example: 1, required: false })
  @IsOptional()
  order?: number;
}
