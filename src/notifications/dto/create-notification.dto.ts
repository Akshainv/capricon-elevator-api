// create-notification.dto.ts
import { IsNotEmpty, IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  icon: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsEnum(['info', 'success', 'warning', 'error'])
  @IsNotEmpty()
  type: 'info' | 'success' | 'warning' | 'error';

  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;

  @IsString()
  @IsOptional()
  actionLink?: string;

  @IsString()
  @IsNotEmpty()
  userId: string; // Reference to user/admin who receives the notification

  @IsString()
  @IsOptional()
  leadId?: string; // Optional reference to related lead
}
