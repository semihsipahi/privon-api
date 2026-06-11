import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'My Awesome Restaurant',
    description: 'The name of the business',
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'John', description: 'First name of the owner' })
  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the owner' })
  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @ApiProperty({ example: 'John Doe Ltd.', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
