import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Kullanıcının e-posta adresi',
    example: 'admin@example.com',
    format: 'email',
    required: true,
  })
  @IsEmail({}, { message: 'Lütfen geçerli bir e-posta adresi giriniz.' })
  email: string;

  @ApiProperty({
    description: 'Kullanıcının giriş şifresi',
    example: 'şifre123',
    required: true,
  })
  @IsNotEmpty({ message: 'Şifre alanı boş bırakılamaz.' })
  password: string;
}