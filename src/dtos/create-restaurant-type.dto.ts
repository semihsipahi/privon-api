import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRestaurantTypeDto {
  @ApiProperty({
    description: 'Restoran türünün adı',
    example: 'Türk Mutfağı',
    required: true,
  })
  @IsString({ message: 'Restoran türü adı bir metin olmalıdır.' })
  @IsNotEmpty({ message: 'Restoran türü adı boş bırakılamaz.' })
  name: string;
}
