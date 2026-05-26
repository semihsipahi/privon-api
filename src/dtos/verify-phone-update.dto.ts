import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MinLength } from 'class-validator';

export class VerifyPhoneUpdateDto {
  @ApiProperty({ description: 'Yeni telefon numarası (10 haneli)', example: '5551234567' })
  @IsString()
  @MinLength(10)
  @Matches(/^5\d{9}$/, { message: 'Geçerli bir Türk telefon numarası girin (5XXXXXXXXX)' })
  phoneNumber: string;

  @ApiProperty({ description: '6 haneli SMS OTP kodu', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP 6 haneli olmalı' })
  otp: string;
}
