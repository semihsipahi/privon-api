import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateSupportRequestDto {
  @ApiProperty({
    description: 'Destek talebi başlığı',
    example: 'Sipariş sorunu',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Destek talebi mesajı',
    example: 'Siparişim gelmedi.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'E-posta adresi',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefon numarası',
    example: '+905551234567',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
