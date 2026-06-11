import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationSettingsDto } from './notification-settings.dto';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Ad Soyad',
    example: 'Ahmet Yılmaz',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'Profil fotoğrafı URL',
    example: 'https://...',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'E-posta adresi',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Doğum tarihi (YYYY-MM-DD)',
    example: '1992-11-14',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'birthDate YYYY-MM-DD formatında olmalı',
  })
  birthDate?: string;

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
