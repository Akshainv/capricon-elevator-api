// src/dashboard/dto/dashboard-filter.dto.ts
import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';

export class DashboardFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['today', 'thisWeek', 'thisMonth', 'thisQuarter', 'last6Months'])
  period?: 'today' | 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'last6Months';

  @IsOptional()
  @IsString()
  assignedTo?: string; // Sales executive ID (for personal dashboard)
}