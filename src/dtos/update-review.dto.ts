import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateReviewDto extends PickType(CreateReviewDto, [
  'rating',
  'comment',
] as const) {
  @ApiProperty({
    description: 'Puan (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  rating: number;

  @ApiProperty({ description: 'Yorum notu' })
  @IsOptional()
  @IsString()
  comment?: string;
}
