import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Kullanıcının mevcut şifresi',
    example: 'eskiSifre123',
    required: true,
  })
  @IsNotEmpty({ message: 'Eski şifre zorunludur.' })
  oldPassword: string;

  @ApiProperty({
    description: 'Kullanıcının yeni şifresi',
    example: 'yeniSifre123',
    minLength: 6,
    required: true,
  })
  @IsNotEmpty({ message: 'Yeni şifre zorunludur.' })
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır.' })
  newPassword: string;
}