import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../models/restaurant-application.schema';

export class UpdateApplicationStatusDto {
    @ApiProperty({ enum: ApplicationStatus, description: 'New status of the application' })
    @IsEnum(ApplicationStatus, { message: 'Geçersiz başvuru durumu' })
    @IsNotEmpty({ message: 'Durum alanı zorunludur' })
    status: ApplicationStatus;
}
