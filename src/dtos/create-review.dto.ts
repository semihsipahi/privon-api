import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  IsMongoId,
} from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsMongoId()
  restaurant: string;

  @IsNotEmpty()
  @IsMongoId()
  slotReservation: string;

  @IsNotEmpty()
  @IsNumber()
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  comment: string;
}
