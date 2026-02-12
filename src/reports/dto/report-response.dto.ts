// src/reports/dto/report-response.dto.ts

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface Performer {
  name: string;
  deals: number;
  revenue: number;
}

export interface ReportSummary {
  totalRevenue: number;
  newLeads: number;
  conversionRate: number;
  avgDealSize: number;
  pipeline: PipelineStage[];
  topPerformers: Performer[];
}

export interface CustomReportResponse {
  filters: any; // You can replace 'any' with a more specific type later
  summary: {
    totalLeads: number;
    totalDeals: number;
    dealsClosed: number;
    totalRevenue: number;
    conversionRate: number;
  };
  pipeline: PipelineStage[];
  performers: Performer[];
}