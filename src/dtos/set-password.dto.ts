import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description: 'Kullanıcının yeni şifresi',
    example: 'güvenliŞifre123',
    minLength: 6,
    required: true,
  })
  @IsNotEmpty({ message: 'Şifre alanı boş bırakılamaz.' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  password: string;
}
