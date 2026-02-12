// src/dashboard/dashboard.service.ts (Backend)
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { deal, dealDocument } from '../deal/schemas/deal.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Lead, LeadDocument } from '../lead/schemas/lead.schema';
import { Quotation, QuotationDocument } from 'src/quotation/schemas/quotation.schema';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(deal.name) private dealModel: Model<dealDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Quotation.name) private quotationModel: Model<QuotationDocument>,
  ) {}

  private getDateRange(filter: DashboardFilterDto) {
    const now = new Date();
    let start: Date = new Date(now.getFullYear(), now.getMonth(), 1);
    let end: Date = new Date();

    if (filter.startDate && filter.endDate) {
      start = new Date(filter.startDate);
      end = new Date(filter.endDate);
    } else if (filter.period) {
      switch (filter.period) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'thisWeek':
          start = new Date(now);
          const day = now.getDay();
          start.setDate(now.getDate() - day);
          start.setHours(0, 0, 0, 0);
          break;
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'thisQuarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          start = new Date(now.getFullYear(), quarterMonth, 1);
          break;
        case 'last6Months':
          start = new Date(now);
          start.setMonth(now.getMonth() - 6);
          start.setDate(1);
          break;
      }
    }

    return { start, end };
  }

  /**
   * ✅ ADMIN DASHBOARD - Shows data from Deal Pipeline, Project List, Lead List
   * Card 1: Deals (from Deal Pipeline - pending deals only, converted: false)
   * Card 2: Projects (from Project List - all projects)
   * Card 3: Leads (from Lead List - assigned leads only)
   */
  async getAdminOverview(filter: DashboardFilterDto = {}) {
    console.log('🔵 ========== ADMIN DASHBOARD SERVICE ==========');
    console.log('🔵 Fetching data for Admin Dashboard Cards');
    console.log('='.repeat(80));
    
    try {
      // ✅ CARD 1: DEALS - From Deal Pipeline (pending/unconverted deals only)
      const allDeals = await this.dealModel.find({ 
        converted: false  // Only pending deals shown in Deal Pipeline
      }).exec();
      
      const totalDeals = allDeals.length;
      const wonDeals = allDeals.filter(d => d.DealStatus === 'won').length;
      const pendingDeals = allDeals.filter(d => d.DealStatus === 'pending').length;
      
      console.log('📊 ADMIN CARD 1 - DEALS (Deal Pipeline):');
      console.log('  - Total Pending Deals:', totalDeals);
      console.log('  - Won Deals:', wonDeals);
      console.log('  - Status Pending:', pendingDeals);

      // ✅ CARD 2: PROJECTS - From Project List (all projects)
      const allProjects = await this.projectModel.find().exec();
      const totalProjects = allProjects.length;
      const activeProjects = allProjects.filter(p => p.projectStatus === 'in_progress').length;
      const completedProjects = allProjects.filter(p => p.projectStatus === 'completed').length;
      
      console.log('📊 ADMIN CARD 2 - PROJECTS (Project List):');
      console.log('  - Total Projects:', totalProjects);
      console.log('  - Active Projects:', activeProjects);
      console.log('  - Completed Projects:', completedProjects);

      // ✅ CARD 3: LEADS - From Lead List (assigned leads only)
      const allLeads = await this.leadModel.find().exec();
      
      const assignedLeads = allLeads.filter(lead => {
        const assignedTo = lead.assignedTo ? String(lead.assignedTo).trim() : '';
        return assignedTo !== '';
      });
      
      const totalLeads = assignedLeads.length;
      const newLeads = assignedLeads.filter(l => l.status === 'New').length;
      
      console.log('📊 ADMIN CARD 3 - LEADS (Lead List):');
      console.log('  - Total Assigned Leads:', totalLeads);
      console.log('  - New Leads:', newLeads);

      // Calculate change indicators
      const dealsChange = wonDeals > 0 
        ? `${wonDeals} won` 
        : totalDeals > 0 
          ? `${pendingDeals} pending` 
          : 'No deals';
      const dealsTrend = wonDeals > 0 ? 'up' : 'neutral';
      
      const projectsChange = activeProjects > 0 
        ? `${activeProjects} active` 
        : completedProjects > 0 
          ? `${completedProjects} completed` 
          : 'No projects';
      const projectsTrend = activeProjects > 0 ? 'up' : 'neutral';

      const leadsChange = newLeads > 0 ? `${newLeads} new` : totalLeads > 0 ? 'All assigned' : 'No leads';
      const leadsTrend = newLeads > 0 ? 'up' : 'neutral';

      // ✅ Chart data - ALL won deals (no user filter)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const monthlyDeals = await this.dealModel.aggregate([
        { 
          $match: { 
            createdAt: { $gte: sixMonthsAgo }, 
            DealStatus: 'won' 
          } 
        },
        { 
          $group: { 
            _id: { 
              year: { $year: '$createdAt' }, 
              month: { $month: '$createdAt' } 
            }, 
            revenue: { $sum: '$dealAmount' }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const chartLabels: string[] = [];
      const revenueData: number[] = [];
      const dealsData: number[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('en-US', { month: 'short' });
        chartLabels.push(month);
        
        const monthData = monthlyDeals.find(m => 
          m._id.year === date.getFullYear() && 
          m._id.month === date.getMonth() + 1
        );
        
        revenueData.push(monthData ? Math.round(monthData.revenue / 100000) : 0);
        dealsData.push(monthData ? monthData.count : 0);
      }

      const result = {
        totalDeals: { 
          value: totalDeals.toString(), 
          change: dealsChange, 
          trend: dealsTrend 
        },
        totalProjects: { 
          value: totalProjects.toString(), 
          change: projectsChange, 
          trend: projectsTrend 
        },
        totalLeads: { 
          value: totalLeads.toString(), 
          change: leadsChange, 
          trend: leadsTrend 
        },
        chartData: { 
          labels: chartLabels, 
          revenue: revenueData, 
          deals: dealsData 
        }
      };

      console.log('✅ ADMIN DASHBOARD RESULT:');
      console.log('  - Card 1 (Deals):', result.totalDeals.value, '- Route: /deals');
      console.log('  - Card 2 (Projects):', result.totalProjects.value, '- Route: /projects');
      console.log('  - Card 3 (Leads):', result.totalLeads.value, '- Route: /leads');
      console.log('='.repeat(80));

      return result;
    } catch (error) {
      console.error('❌ Error in getAdminOverview:', error);
      throw error;
    }
  }

  /**
   * ✅ SALES EXECUTIVE DASHBOARD - Shows user-specific data
   * Card 1: My Quotations (filtered by createdBy)
   * Card 2: My Leads (created + assigned)
   * Card 3: My Projects (assigned to me)
   */
  async getSalesExecutiveDashboard(userId: string, filter: DashboardFilterDto = {}) {
    console.log('🔵 ========== SALES EXECUTIVE DASHBOARD ==========');
    console.log('👤 User ID:', userId);
    console.log('='.repeat(80));
    
    const { start, end } = this.getDateRange(filter);
    const userIdString = String(userId).trim();
    
    try {
      // ✅ CARD 1: MY QUOTATIONS (filtered by createdBy)
      const myQuotations = await this.quotationModel.find({ 
        createdBy: userIdString 
      }).exec();
      
      const totalQuotationsCount = myQuotations.length;
      console.log('📊 SALES CARD 1 - MY QUOTATIONS:', totalQuotationsCount);

      // ✅ CARD 2: MY LEADS (created by me + assigned to me)
      const [createdByMe, assignedToMe] = await Promise.all([
        this.leadModel.find({ createdBy: userIdString }).exec(),
        this.leadModel.find({ assignedTo: userIdString }).exec()
      ]);
      
      const allMyLeadsIds = new Set([
        ...createdByMe.map(l => l._id.toString()),
        ...assignedToMe.map(l => l._id.toString())
      ]);
      
      const myLeadsCount = allMyLeadsIds.size;
      console.log('📊 SALES CARD 2 - MY LEADS:', myLeadsCount);

      // ✅ CARD 3: MY PROJECTS (assigned to me)
      const myProjects = await this.projectModel.find({ 
        assignedTo: userIdString 
      }).exec();
      
      const myProjectsCount = myProjects.length;
      console.log('📊 SALES CARD 3 - MY PROJECTS:', myProjectsCount);

      // Previous period comparison
      const lastMonthStart = new Date(start);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(end);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

      const [lastMonthQuotationsCount, lastMonthLeadsCount, lastMonthProjectsCount] = await Promise.all([
        this.quotationModel.countDocuments({ 
          createdBy: userIdString,
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }),
        this.leadModel.countDocuments({ 
          assignedTo: userIdString,
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }),
        this.projectModel.countDocuments({ 
          assignedTo: userIdString,
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        })
      ]);

      // Calculate trends
      const quotationsDiff = totalQuotationsCount - lastMonthQuotationsCount;
      const quotationsChange = quotationsDiff > 0 
        ? `+${quotationsDiff} new` 
        : quotationsDiff < 0 
          ? `${quotationsDiff} less` 
          : totalQuotationsCount > 0 ? 'Stable' : 'No quotations';
      const quotationsTrend = quotationsDiff > 0 ? 'up' : quotationsDiff < 0 ? 'down' : 'neutral';

      const leadsDiff = myLeadsCount - lastMonthLeadsCount;
      const leadsChange = leadsDiff > 0 
        ? `+${leadsDiff} new` 
        : leadsDiff < 0 
          ? `${leadsDiff} less` 
          : myLeadsCount > 0 ? 'Stable' : 'No leads';
      const leadsTrend = leadsDiff > 0 ? 'up' : leadsDiff < 0 ? 'down' : 'neutral';

      const projectsDiff = myProjectsCount - lastMonthProjectsCount;
      const projectsChange = projectsDiff > 0 
        ? `+${projectsDiff} new` 
        : projectsDiff < 0 
          ? `${projectsDiff} less` 
          : myProjectsCount > 0 ? 'Stable' : 'No projects';
      const projectsTrend = projectsDiff > 0 ? 'up' : projectsDiff < 0 ? 'down' : 'neutral';

      // Chart data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const monthlyLeadsData = await this.leadModel.aggregate([
        { 
          $match: { 
            assignedTo: userIdString, 
            createdAt: { $gte: sixMonthsAgo }
          } 
        },
        { 
          $group: { 
            _id: { 
              year: { $year: '$createdAt' }, 
              month: { $month: '$createdAt' },
              status: '$status'
            }, 
            count: { $sum: 1 }
          } 
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const chartLabels: string[] = [];
      const dealsData: number[] = [];
      const leadsData: number[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('en-US', { month: 'short' });
        chartLabels.push(month);
        
        const wonCount = monthlyLeadsData
          .filter(m => 
            m._id.year === date.getFullYear() && 
            m._id.month === date.getMonth() + 1 &&
            m._id.status === 'Won'
          )
          .reduce((sum, m) => sum + m.count, 0);
        
        const allLeadsCount = monthlyLeadsData
          .filter(m => 
            m._id.year === date.getFullYear() && 
            m._id.month === date.getMonth() + 1
          )
          .reduce((sum, m) => sum + m.count, 0);
        
        dealsData.push(wonCount);
        leadsData.push(allLeadsCount);
      }

      const result = {
        stats: {
          totalQuotations: { 
            value: totalQuotationsCount, 
            change: quotationsChange, 
            trend: quotationsTrend 
          },
          myLeads: { 
            value: myLeadsCount, 
            change: leadsChange, 
            trend: leadsTrend 
          },
          myProjects: { 
            value: myProjectsCount, 
            change: projectsChange, 
            trend: projectsTrend 
          }
        },
        chartData: { 
          labels: chartLabels, 
          revenue: dealsData,
          deals: leadsData
        }
      };

      console.log('✅ SALES DASHBOARD RESULT:');
      console.log('  - My Quotations:', result.stats.totalQuotations.value);
      console.log('  - My Leads:', result.stats.myLeads.value);
      console.log('  - My Projects:', result.stats.myProjects.value);
      console.log('='.repeat(80));

      return result;
    } catch (error) {
      console.error('❌ Error in getSalesExecutiveDashboard:', error);
      throw error;
    }
  }
}