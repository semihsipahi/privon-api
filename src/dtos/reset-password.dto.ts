import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
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
}

export class VerifyResetCodeDto {
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
    description: 'SMS ile gönderilen 4 haneli doğrulama kodu',
    example: '1234',
    required: true,
  })
  @IsString({ message: 'Doğrulama kodu bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Doğrulama kodu boş bırakılamaz.' })
  @Length(4, 4, { message: 'Doğrulama kodu 4 haneli olmalıdır.' })
  verificationCode: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Şifre sıfırlama tokenı (verify-reset-code endpointinden döner)',
    required: true,
  })
  @IsString({ message: 'Token bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Token boş bırakılamaz.' })
  resetToken: string;

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