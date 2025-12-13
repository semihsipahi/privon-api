import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateApplicationDto {
    @IsString()
    @IsNotEmpty()
    businessName: string;

    @IsString()
    @IsNotEmpty()
    ownerFirstName: string;

    @IsString()
    @IsNotEmpty()
    ownerLastName: string;

    @IsString()
    @IsNotEmpty()
    companyName: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;
}
