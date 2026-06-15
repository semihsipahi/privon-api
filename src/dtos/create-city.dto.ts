import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ description: 'Şehir adı', example: 'Istanbul' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Ülke adı', example: 'Turkey' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ description: 'Eyalet/bölge', example: 'California' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Başkent mi?', default: false })
  @IsBoolean()
  @IsOptional()
  isCapital?: boolean;

  @ApiPropertyOptional({ description: 'Leisure destination mi?', default: false })
  @IsBoolean()
  @IsOptional()
  isDestination?: boolean;

  @ApiPropertyOptional({ description: 'ISO ülke kodu', example: 'TR' })
  @IsString()
  @IsOptional()
  countryCode?: string;
}
