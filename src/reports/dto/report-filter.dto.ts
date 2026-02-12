// src/reports/dto/report-filter.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
  dealStage?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'rejected'])
  quotationStatus?: string;
}

export interface PipelineStage {
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  count: number;
  value: number;
}

export interface TopPerformer {
  name: string;
  dealsClosed: number;
  revenue: number;
}

export interface ReportSummaryResponse {
  totalRevenue: number;
  totalProjects: number;
  projectsWon: number;
  // ✅ Backward compatibility fields
  totalDeals?: number;
  dealsWon?: number;
  quotationsSent: number;
  quotationsAccepted: number;
  conversionRate: number;
  avgDealSize: number;
  pipeline: PipelineStage[];
  topPerformers: TopPerformer[];
}

export interface CustomReportResponse {
  filters: ReportFilterDto;
  summary: {
    totalProjects: number;
    projectsWon: number;
    // ✅ Backward compatibility fields
    totalDeals?: number;
    dealsWon?: number;
    totalRevenue: number;
    totalQuotations: number;
    quotationsAccepted: number;
    conversionRate: number;
  };
  pipeline: PipelineStage[];
  topPerformers: TopPerformer[];
}