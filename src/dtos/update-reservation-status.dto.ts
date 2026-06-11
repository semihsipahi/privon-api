import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateReservationStatusDto {
  @ApiProperty({
    description: 'Yeni durum',
    enum: ReservationStatus,
  })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Toplam tutar (Gerekli: Status completed ise)',
    example: 1000,
  })
  @ValidateIf((o) => o.status === ReservationStatus.COMPLETED)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'İndirime dahil olmayan tutar (Opsiyonel)',
    example: 200,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nonDiscountedAmount?: number;
}
