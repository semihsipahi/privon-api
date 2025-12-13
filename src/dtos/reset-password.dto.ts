import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
    required: true,
  })
  @IsString({ message: 'Telefon numarası bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Telefon numarası boş bırakılamaz.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Geçerli bir uluslararası telefon numarası giriniz (+ ile başlamalı).',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'SMS ile gönderilen 6 haneli doğrulama kodu',
    example: '123456',
    required: true,
  })
  @IsString({ message: 'Doğrulama kodu bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Doğrulama kodu boş bırakılamaz.' })
  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
  verificationCode: string;

  @ApiProperty({
    description: 'Kullanıcının yeni şifresi',
    example: 'yeniGüvenliŞifre123',
    minLength: 6,
    required: true,
  })
  @IsNotEmpty({ message: 'Şifre zorunludur.' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  newPassword: string;
}