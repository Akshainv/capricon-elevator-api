import { IsString, MinLength, Matches, NotEquals } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'New password must contain at least one uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @IsString()
  @NotEquals('currentPassword')
  confirmPassword: string;
}