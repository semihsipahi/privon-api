import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ description: 'Restoran sahibinin yanıtı' })
  @IsString()
  @IsNotEmpty()
  reply: string;
}
