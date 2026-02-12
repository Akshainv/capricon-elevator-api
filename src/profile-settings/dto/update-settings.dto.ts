import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  leadAssignments?: boolean;

  @IsBoolean()
  @IsOptional()
  dealUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  quotationApprovals?: boolean;

  @IsBoolean()
  @IsOptional()
  taskReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  followUpAlerts?: boolean;
}