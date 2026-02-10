import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateWaitlistDto {
    @ApiProperty({ description: 'İsim ve Soyisim', example: 'Ali Vural' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ description: 'E-posta Adresi', example: 'vural@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Telefon Numarası (Mobil)', example: '+90 5XX XXX XX XX' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiPropertyOptional({ description: 'Referans Üye', example: 'Mehmet Yılmaz' })
    @IsString()
    @IsOptional()
    referralMember?: string;

    @ApiPropertyOptional({ description: 'Gastronomi Referansı', example: 'Mikla / Şef Mehmet Gürs' })
    @IsString()
    @IsOptional()
    gastronomyReference?: string;

    @ApiProperty({ description: 'Şehir', example: 'İstanbul' })
    @IsString()
    @IsNotEmpty()
    city: string;
}
