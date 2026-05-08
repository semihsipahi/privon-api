import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsBoolean,
    Equals,
} from 'class-validator';

export class CreateWaitlistDto {
    @ApiProperty({ description: 'İsim', example: 'Semih' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ description: 'Soyisim', example: 'Sipahi' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ description: 'E-posta Adresi', example: 'semih@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Telefon Numarası', example: '05536277010' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({ description: 'Şehir', example: 'Istanbul' })
    @IsString()
    @IsNotEmpty()
    city: string;

    @ApiPropertyOptional({
        description:
            'Name 2-3 establishments (globally) that reflect your standard of hospitality.',
    })
    @IsString()
    @IsOptional()
    hospitalityStandards?: string;

    @ApiPropertyOptional({
        description:
            'Are you currently a member of any private clubs or exclusive networks?',
    })
    @IsString()
    @IsOptional()
    privateClubMemberships?: string;

    @ApiPropertyOptional({
        description: 'Which cities do you frequent most for business or leisure?',
    })
    @IsString()
    @IsOptional()
    frequentCities?: string;

    @ApiPropertyOptional({
        description: 'What do you value most in a hospitality experience?',
    })
    @IsString()
    @IsOptional()
    hospitalityValues?: string;

    @ApiPropertyOptional({
        description:
            'How were you introduced to PRIVON? (If referred by a current member, please state their name).',
    })
    @IsString()
    @IsOptional()
    introducedBy?: string;

    @ApiProperty({
        description: 'I have read and agree to the Terms of Access.',
        example: true,
    })
    @IsBoolean()
    @Equals(true, { message: 'Terms of Access must be accepted' })
    agreedToTerms: boolean;

    @ApiProperty({
        description: 'I have read and agree to the Privacy Notice.',
        example: true,
    })
    @IsBoolean()
    @Equals(true, { message: 'Privacy Notice must be accepted' })
    agreedToPrivacy: boolean;

    @ApiPropertyOptional({
        description:
            'I consent to receive private communications, curated invitations, and updates from the PRIVON network.',
        example: false,
    })
    @IsBoolean()
    @IsOptional()
    consentToCommunications?: boolean;
}
