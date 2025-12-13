import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class FilterModel {
  @ApiProperty({
    example: 0,
    description: 'current page number',
    required: false,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  page?: number = 0;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'current page size',
  })
  @IsNumber()
  size?: number = 15;

  @ApiProperty({
    example: '',
    required: false,
    description: 'list sort for fieldname',
    type: String,
  })
  @IsString()
  sort?: string = '';

  @ApiProperty({
    example: '',
    required: false,
    description: 'list sort type',
    type: String,
  })
  @IsString()
  sortBy?: string = '';

  @ApiProperty({
    example: '',
    required: false,
    description: 'Search query filter',
    type: String,
  })
  @IsString()
  filter?: string = '';

  @ApiProperty({
    example: false,
    required: false,
    description: 'count of total items',
    type: Boolean,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  count?: boolean = false;
}
