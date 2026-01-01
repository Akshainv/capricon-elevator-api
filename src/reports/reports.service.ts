// src/reports/reports.service.ts - UPDATED with deals pipeline
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ReportFilterDto,
  ReportSummaryResponse,
  CustomReportResponse,
  PipelineStage,
  TopPerformer,
} from './dto/report-filter.dto';

@Injectable()
export class ReportsService {
  private readonly dealStages: PipelineStage['stage'][] = [
    'lead',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
  ];

  constructor(
    @InjectModel('deal') private readonly dealModel: Model<any>,
    @InjectModel('Quotation') private readonly quotationModel: Model<any>,
    @InjectModel('Project') private readonly projectModel: Model<any>,
    @InjectModel('Employee') private readonly employeeModel: Model<any>,
  ) {}

  private buildDateFilter(filters?: ReportFilterDto): any {
    const filter: any = {};
    if (filters?.startDate || filters?.endDate) {
      filter.createdAt = {};
      if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) filter.createdAt.$lte = new Date(filters.endDate);
    }
    return filter;
  }

  private addOptionalFilters(base: any, filters: ReportFilterDto) {
    if (filters.employeeId) base.assignedTo = filters.employeeId;
    if (filters.dealStage) base.DealStatus = filters.dealStage;
    return base;
  }

  // ✅ NEW: Dedicated method for fetching top performers
  async getTopPerformers(filters?: ReportFilterDto, limit: number = 10): Promise<TopPerformer[]> {
    const dateFilter = this.buildDateFilter(filters);
    
    const topPerformersAgg = await this.projectModel.aggregate([
      { 
        $match: { 
          projectStatus: 'completed', 
          ...dateFilter,
          assignedTo: { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$assignedTo',
          dealsClosed: { $sum: 1 },
          revenue: { $sum: '$projectValue' },
        },
      },
      { $sort: { revenue: -1, dealsClosed: -1 } },
      { $limit: limit },
    ]);

    const topPerformers: TopPerformer[] = await Promise.all(
      topPerformersAgg.map(async (p) => {
        let employeeName = 'Unknown Employee';
        
        try {
          let employee = await this.employeeModel.findById(p._id).exec();
          
          if (!employee) {
            employee = await this.employeeModel.findOne({ employeeId: p._id }).exec();
          }
          
          if (!employee && typeof p._id === 'string' && p._id.includes('@')) {
            employee = await this.employeeModel.findOne({ email: p._id }).exec();
          }
          
          if (!employee) {
            employee = await this.employeeModel.findOne({ username: p._id }).exec();
          }
          
          if (employee) {
            employeeName = employee.fullName || employee.name || employee.email || employee.username || 'Unknown Employee';
          }
        } catch (error) {
          console.error(`Error fetching employee for ID ${p._id}:`, error);
        }

        return {
          name: employeeName,
          dealsClosed: p.dealsClosed,
          revenue: p.revenue,
        };
      })
    );

    return topPerformers;
  }

  async getGeneralSummary(): Promise<ReportSummaryResponse> {
    const dateFilter = this.buildDateFilter();

    // Total projects count
    const totalProjects = await this.projectModel.countDocuments(dateFilter);

    // Completed projects count
    const projectsWon = await this.projectModel.countDocuments({
      projectStatus: 'completed',
      ...dateFilter,
    });

    // Total revenue from completed projects
    const revenueAgg = await this.projectModel.aggregate([
      { $match: { projectStatus: 'completed', ...dateFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$projectValue' },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Quotations
    const quotationsSent = await this.quotationModel.countDocuments({
      status: 'sent',
      ...dateFilter,
    });
    const quotationsAccepted = await this.quotationModel.countDocuments({
      status: 'accepted',
      ...dateFilter,
    });

    // ✅ UPDATED: Pipeline stages from DEALS collection
    const pipeline = await Promise.all(
      this.dealStages.map(async (stage) => {
        const count = await this.dealModel.countDocuments({
          DealStatus: stage,
          ...dateFilter,
        });
        const valueAgg = await this.dealModel.aggregate([
          { $match: { DealStatus: stage, ...dateFilter } },
          { $group: { _id: null, total: { $sum: '$dealAmount' } } },
        ]);
        return {
          stage,
          count,
          value: valueAgg[0]?.total || 0,
        };
      }),
    );

    // ✅ CHANGED: Use dedicated method for top performers
    const topPerformers = await this.getTopPerformers(undefined, 10);

    const conversionRate = totalProjects > 0 ? Math.round((projectsWon / totalProjects) * 100) : 0;
    const avgDealSize = projectsWon > 0 ? Math.round(totalRevenue / projectsWon) : 0;

    return {
      totalRevenue,
      totalProjects,
      projectsWon,
      totalDeals: totalProjects,
      dealsWon: projectsWon,
      quotationsSent,
      quotationsAccepted,
      conversionRate,
      avgDealSize,
      pipeline,
      topPerformers,
    };
  }

  async getCustomReport(filters: ReportFilterDto): Promise<CustomReportResponse> {
    const dateFilter = this.buildDateFilter(filters);
    let matchFilter = { ...dateFilter };
    matchFilter = this.addOptionalFilters(matchFilter, filters);

    // Use projects instead of deals for revenue calculations
    const completedMatch = { ...matchFilter, projectStatus: 'completed' };

    // Revenue & completed projects count
    const revenueAgg = await this.projectModel.aggregate([
      { $match: completedMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$projectValue' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const projectsWon = revenueAgg[0]?.count || 0;
    const totalProjects = await this.projectModel.countDocuments(matchFilter);

    // Quotations
    const quotationFilter: any = { ...dateFilter };
    if (filters.quotationStatus) quotationFilter.status = filters.quotationStatus;

    const totalQuotations = await this.quotationModel.countDocuments(quotationFilter);
    const quotationsAccepted = await this.quotationModel.countDocuments({
      ...quotationFilter,
      status: 'accepted',
    });

    // ✅ UPDATED: Pipeline from DEALS collection
    const pipeline = await Promise.all(
      this.dealStages.map(async (stage) => {
        const stageMatch = { ...matchFilter, DealStatus: stage };
        const count = await this.dealModel.countDocuments(stageMatch);
        const valueAgg = await this.dealModel.aggregate([
          { $match: stageMatch },
          { $group: { _id: null, total: { $sum: '$dealAmount' } } },
        ]);
        return { stage, count, value: valueAgg[0]?.total || 0 };
      }),
    );

    // ✅ CHANGED: Use dedicated method for top performers with filters
    const topPerformers = await this.getTopPerformers(filters, 10);

    const conversionRate = totalProjects > 0 ? Math.round((projectsWon / totalProjects) * 100) : 0;

    return {
      filters,
      summary: {
        totalProjects,
        projectsWon,
        totalDeals: totalProjects,
        dealsWon: projectsWon,
        totalRevenue,
        totalQuotations,
        quotationsAccepted,
        conversionRate,
      },
      pipeline,
      topPerformers,
    };
  }
}