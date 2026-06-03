import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Ad', example: 'Ahmet' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Yılmaz' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ description: 'Telefon numarası (10 hane)', example: '5551234567' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Telefon numarası 10 haneli olmalıdır' })
  phoneNumber: string;

  @ApiProperty({ description: 'E-posta (opsiyonel)', example: 'kullanici@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Doğum tarihi YYYY-MM-DD (opsiyonel)', example: '1990-01-15', required: false })
  @IsOptional()
  @IsString()
  birthDate?: string;
}
