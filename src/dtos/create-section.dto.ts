import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({ example: 'Öne Çıkan Restoranlar' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'home', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: ['60d5ecb8b392d60015f8e5d1'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  restaurants: string[];
}
