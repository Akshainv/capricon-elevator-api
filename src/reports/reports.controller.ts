// src/reports/reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto, ReportSummaryResponse, CustomReportResponse } from './dto/report-filter.dto';
import type { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(): Promise<ReportSummaryResponse> {
    return this.reportsService.getGeneralSummary();
  }

  @Post('custom')
  async getCustomReport(@Body() filters: ReportFilterDto): Promise<CustomReportResponse> {
    return this.reportsService.getCustomReport(filters);
  }

  @Get('top-performers')
  async getTopPerformers(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: ReportFilterDto = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const topPerformers = await this.reportsService.getTopPerformers(filters, limitNum);
    
    return {
      success: true,
      data: topPerformers,
      count: topPerformers.length,
      filters: {
        limit: limitNum,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('export')
  async exportReport(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('dealStage') dealStage?: string,
    @Query('quotationStatus') quotationStatus?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const filters: ReportFilterDto = {
      startDate,
      endDate,
      employeeId,
      dealStage,
      quotationStatus,
    };

    const data = await this.reportsService.getCustomReport(filters);

    if (format === 'csv') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'CSV export is not yet implemented',
      });
    }

    res.status(HttpStatus.OK).json({
      message: 'Report exported successfully',
      format,
      generatedAt: new Date().toISOString(),
      filters,
      data,
    });
  }
}