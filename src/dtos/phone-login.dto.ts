import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PhoneLoginDto {
  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
    required: true,
  })
  @IsString({ message: 'Telefon numarası bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Telefon numarası boş bırakılamaz.' })
  phoneNumber: string;

  @ApiProperty({
    description: 'Kullanıcının giriş şifresi',
    example: 'şifre123',
    required: true,
  })
  @IsNotEmpty({ message: 'Şifre alanı boş bırakılamaz.' })
  password: string;
}

