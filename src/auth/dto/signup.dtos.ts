import { IsString, MinLength, IsEmail, IsEnum } from "class-validator";

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  
}
