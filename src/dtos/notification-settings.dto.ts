import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationSettingsDto {
    @ApiProperty({
        description: 'Email notification preference',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    email?: boolean;

    @ApiProperty({
        description: 'SMS notification preference',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    sms?: boolean;

    @ApiProperty({
        description: 'Campaign notification preference',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    campaign?: boolean;

    @ApiProperty({
        description: 'Promotion notification preference',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    promotion?: boolean;
}
