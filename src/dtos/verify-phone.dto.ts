import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyPhoneDto {
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
