import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsArray,
    ValidateNested,
    IsBoolean,
    IsMongoId,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../common/enums/discount.enum';

export class DateRangeDto {
    @ApiPropertyOptional({ description: 'Başlangıç tarihi' })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: 'Bitiş tarihi' })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;

    @ApiPropertyOptional({ description: 'Süresiz mi?', default: false })
    @IsBoolean()
    @IsOptional()
    isUnlimited?: boolean;
}

export class CreateDiscountScheduleDto {


    @ApiProperty({
        description: 'Aktif günler',
        type: [String],
        enum: DayOfWeek,
        example: ['monday', 'tuesday', 'wednesday'],
    })
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    activeDays: DayOfWeek[];

    @ApiProperty({ description: 'Başlangıç saati', example: '14:00' })
    @IsString()
    startTime: string;

    @ApiProperty({ description: 'Bitiş saati', example: '18:00' })
    @IsString()
    endTime: string;

    @ApiPropertyOptional({
        description: 'Slot süresi (dakika)',
        default: 30,
        example: 30,
    })
    @IsNumber()
    @IsOptional()
    @Min(15)
    @Max(120)
    slotDurationMinutes?: number;

    @ApiProperty({ description: 'Her slotta müsait masa sayısı', example: 5 })
    @IsNumber()
    @Min(1)
    tablesPerSlot: number;

    @ApiProperty({ description: 'Minimum kişi sayısı', example: 2 })
    @IsNumber()
    @Min(1)
    minGuests: number;

    @ApiProperty({ description: 'Maksimum kişi sayısı', example: 6 })
    @IsNumber()
    @Min(1)
    maxGuests: number;

    @ApiProperty({
        description: 'İndirim yüzdesi (0-100)',
        example: 20,
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercentage: number;

    @ApiPropertyOptional({ description: 'Tarih aralığı', type: DateRangeDto })
    @ValidateNested()
    @Type(() => DateRangeDto)
    @IsOptional()
    dateRange?: DateRangeDto;

    @ApiPropertyOptional({ description: 'Aktif mi?', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
