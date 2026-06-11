import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SendPhoneUpdateOtpDto {
  @ApiProperty({
    description: 'Yeni telefon numarası (10 haneli, ülke kodu olmadan)',
    example: '5551234567',
  })
  @IsString()
  @MinLength(10)
  @Matches(/^5\d{9}$/, {
    message: 'Geçerli bir Türk telefon numarası girin (5XXXXXXXXX)',
  })
  phoneNumber: string;
}
