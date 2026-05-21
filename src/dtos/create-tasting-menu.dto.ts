import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsBoolean,
  IsNumber, IsArray, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TastingMenuCourseDto {
  @ApiProperty({ example: 'Amuse-Bouche', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Tarhana, yanık yoğurt, isli tereyağı', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateTastingMenuDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ example: 'Anadolu\'nun Derinlikleri', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Depths of Anatolia', required: false })
  @IsString()
  @IsOptional()
  titleEn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({ example: '2.5 - 3 saat', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 4800, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerPerson?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ type: [TastingMenuCourseDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TastingMenuCourseDto)
  courses?: TastingMenuCourseDto[];

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
