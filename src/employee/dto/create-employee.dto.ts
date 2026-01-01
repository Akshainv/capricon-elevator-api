import { IsEmail, IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional() 
  @IsString()
  @IsIn(['pending', 'accept', 'reject'])
  status?: string;
}