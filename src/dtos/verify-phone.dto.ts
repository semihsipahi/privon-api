import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({
    description: 'SMS ile gönderilen 6 haneli doğrulama kodu',
    example: '123456',
    required: true,
  })
  @IsString({ message: 'Doğrulama kodu bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Doğrulama kodu boş bırakılamaz.' })
  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
  verificationCode: string;
}
