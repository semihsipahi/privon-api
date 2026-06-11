import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ description: 'Banner resim URL' })
  @IsString()
  image: string;

  @ApiProperty({ description: 'Banner başlığı', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Banner alt başlığı', required: false })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ description: 'Sıralama numarası', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}
