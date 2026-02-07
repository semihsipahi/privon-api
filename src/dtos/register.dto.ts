import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
    required: true,
  })
  @IsString({ message: 'Telefon numarası bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Telefon numarası boş bırakılamaz.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Geçerli bir uluslararası telefon numarası giriniz (+ ile başlamalı).',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Davet kodu',
    example: 'EMRE2024',
    required: true,
  })
  @IsString({ message: 'Davet kodu bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Davet kodu boş bırakılamaz.' })
  referralCode: string;
}
