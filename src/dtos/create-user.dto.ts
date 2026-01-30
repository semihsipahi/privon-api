import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from 'src/common/enums/role.enum';
import { NotificationSettingsDto } from './notification-settings.dto';
import { UserStatus } from 'src/common/enums/user-status.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'Kullanıcının tam adı',
    example: 'Ahmet Yılmaz',
    required: true,
  })
  @IsString({ message: 'İsim alanı bir metin olmalıdır.' })
  fullName: string;

  @ApiProperty({
    description: 'Kullanıcının e-posta adresi',
    example: 'ahmet.yilmaz@example.com',
    format: 'email',
    required: true,
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @ApiProperty({
    description: 'Kullanıcının telefon numarası',
    example: '+905551234567',
    required: true,
  })
  @IsString({ message: 'Telefon numarası alanı bir metin olmalıdır.' })
  phoneNumber: string;

  @ApiProperty({
    description: 'Kullanıcının sistem rolü',
    enum: Role,
    example: Role.User,
    required: true,
  })
  @IsEnum(Role, { message: 'Rol, yalnızca Role.SuperAdmin veya Role.User olmalıdır.' })
  role: Role;

  @ApiProperty({
    description: 'Kullanıcı durumu',
    enum: UserStatus,
    example: UserStatus.Active,
    required: false,
    default: UserStatus.Active,
  })
  @IsEnum(UserStatus, { message: 'Geçersiz kullanıcı durumu.' })
  @IsOptional()
  status?: UserStatus;

  @ApiProperty({
    description: 'IP Adresi',
    example: '127.0.0.1',
    required: false,
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({
    description: 'Kullanıcının giriş şifresi',
    example: 'güvenliŞifre123',
    minLength: 1,
    required: true,
  })
  @IsNotEmpty({ message: 'Şifre alanı boş bırakılamaz.' })
  password: string;

  @ApiProperty({
    description: 'Bildirim ayarları',
    type: () => NotificationSettingsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notification?: NotificationSettingsDto;
}