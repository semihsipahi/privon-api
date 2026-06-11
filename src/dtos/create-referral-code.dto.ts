import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateReferralCodeDto {
  @ApiProperty({
    description: 'Kodun atandığı kişi/kurum adı',
    example: 'Emre',
  })
  @IsString()
  @IsNotEmpty({ message: 'Atanan isim boş olamaz.' })
  assignedTo: string;

  @ApiProperty({
    description: 'Açıklama/notlar',
    example: 'Gastronomi sayfası influencer',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Maksimum kayıt kotası', example: 30 })
  @IsNumber()
  @Min(1, { message: 'Kota en az 1 olmalıdır.' })
  quota: number;

  @ApiProperty({
    description: 'Özel kod (boş bırakılırsa otomatik oluşturulur)',
    required: false,
    example: 'EMRE2024',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Referral code type', example: 'corporate' })
  type?: string;
}
