import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CheckPhoneDto {
  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
  })
  @IsString({ message: 'Telefon numarası bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Telefon numarası boş bırakılamaz.' })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Geçerli bir uluslararası telefon numarası giriniz (+ ile başlamalı).',
  })
  phoneNumber: string;
}
