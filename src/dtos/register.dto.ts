import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
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
    example: 'PRIVON2024XYZ',
  })
  @IsString({ message: 'Davet kodu bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Davet kodu boş bırakılamaz.' })
  inviteCode: string;

  @ApiProperty({ description: 'İsim', example: 'Semih' })
  @IsString({ message: 'İsim bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'İsim boş bırakılamaz.' })
  firstName: string;

  @ApiProperty({ description: 'Soyisim', example: 'Sipahi' })
  @IsString({ message: 'Soyisim bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Soyisim boş bırakılamaz.' })
  lastName: string;

  @ApiProperty({ description: 'E-posta adresi', example: 'semih@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta boş bırakılamaz.' })
  email: string;

  @ApiProperty({
    description: 'Doğum tarihi (YYYY-MM-DD)',
    example: '1990-05-15',
  })
  @IsDateString({}, { message: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Doğum tarihi boş bırakılamaz.' })
  birthDate: string;

  @ApiPropertyOptional({
    description: 'Pazarlama iletişimlerine onay',
    example: false,
  })
  @IsBoolean({ message: 'Pazarlama onayı boolean olmalıdır.' })
  @IsOptional()
  acceptedMarketing?: boolean;
}
