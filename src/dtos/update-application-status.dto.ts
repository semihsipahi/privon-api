import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '../models/restaurant-application.schema';

export class UpdateApplicationStatusDto {
    @IsEnum(ApplicationStatus, { message: 'Geçersiz başvuru durumu' })
    @IsNotEmpty({ message: 'Durum alanı zorunludur' })
    status: ApplicationStatus;
}
