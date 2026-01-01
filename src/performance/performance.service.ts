// src/performance/performance.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { deal } from '../deal/schemas/deal.schema';
import { Quotation } from '../quotation/schemas/quotation.schema';

export interface TargetData {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  icon: string;
  color: string;
}

export interface ActivitySummary {
  calls: number;
  emails: number;
  meetings: number;
  quotes: number;
}

export interface TopClient {
  name: string;
  revenue: number;
  deals: number;
  avatar: string;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  deals: number;
}

export interface PerformanceResponse {
  targetsData: TargetData[];
  activitySummary: ActivitySummary;
  topClients: TopClient[];
  revenueBreakdown: RevenueBreakdown[];
  monthlyTrend: MonthlyTrend[];
  overallAchievement: number;
}

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel('deal') private dealModel: Model<any>, // ← Changed to match what's registered
    @InjectModel('Quotation') private quotationModel: Model<any>, // ← Changed to match what's registered
  ) {}

  private getMonthRange(monthYear: string = 'December 2025') {
    const [monthName, year] = monthYear.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const start = new Date(Number(year), monthIndex, 1);
    const end = new Date(Number(year), monthIndex + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private getLast6Months(): { month: string; start: Date; end: Date }[] {
    const months: { month: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString('en-US', { month: 'short' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }
    return months;
  }

  async getSalesPerformance(userId: string, monthYear?: string): Promise<PerformanceResponse> {
    const { start: monthStart, end: monthEnd } = this.getMonthRange(monthYear);

    // Get all deals for this user in the month
    const monthDeals = await this.dealModel.find({
      assignedTo: userId,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }).exec();

    const wonDealsThisMonth = monthDeals.filter(d => d.DealStatus === 'won');
    const revenueThisMonth = wonDealsThisMonth.reduce((sum, d) => sum + (d.dealAmount || 0), 0);
    const newLeadsThisMonth = monthDeals.filter(d => d.DealStatus === 'lead').length;

    // Get quotes for this user in the month - FIXED: added userId filter
    const quotesSentThisMonth = await this.quotationModel.countDocuments({
      assignedTo: userId, // ← Added this filter
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const targetsData: TargetData[] = [
      { 
        metric: 'Revenue Target', 
        target: 5000000, 
        actual: revenueThisMonth, 
        unit: '₹', 
        icon: 'fa-rupee-sign', 
        color: '#22c55e' 
      },
      { 
        metric: 'Deals Target', 
        target: 20, 
        actual: wonDealsThisMonth.length, 
        unit: '', 
        icon: 'fa-handshake', 
        color: '#3b82f6' 
      },
      { 
        metric: 'New Leads Target', 
        target: 50, 
        actual: newLeadsThisMonth, 
        unit: '', 
        icon: 'fa-users', 
        color: '#f59e0b' 
      },
      { 
        metric: 'Follow-ups Target', 
        target: 100, 
        actual: quotesSentThisMonth, 
        unit: '', 
        icon: 'fa-phone', 
        color: '#a855f7' 
      },
    ];

    // Activity summary - using real data where possible
    const activitySummary: ActivitySummary = {
      calls: monthDeals.length * 3, // Estimate: 3 calls per deal
      emails: monthDeals.length * 2, // Estimate: 2 emails per deal
      meetings: wonDealsThisMonth.length, // Assume 1 meeting per won deal
      quotes: quotesSentThisMonth,
    };

    // Top clients by revenue
    const topClientsAgg = await this.dealModel.aggregate([
      { $match: { assignedTo: userId, DealStatus: 'won' } },
      {
        $group: {
          _id: '$companyName',
          revenue: { $sum: '$dealAmount' },
          deals: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const avatars = ['Building', 'Hospital', 'Apartments', 'Briefcase', 'Mall'];
    const topClients: TopClient[] = topClientsAgg.map((c, i) => ({
      name: c._id || 'Unknown Client',
      revenue: c.revenue,
      deals: c.deals,
      avatar: avatars[i] || 'Building',
    }));

    // Revenue breakdown by deal details/category
    const breakdownAgg = await this.dealModel.aggregate([
      { $match: { assignedTo: userId, DealStatus: 'won' } },
      {
        $group: {
          _id: '$dealDetails',
          amount: { $sum: '$dealAmount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const totalRevenueAllTime = breakdownAgg.reduce((sum, b) => sum + b.amount, 0);
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#94a3b8'];

    const revenueBreakdown: RevenueBreakdown[] = breakdownAgg.map((b, i) => ({
      category: b._id || 'Other',
      amount: b.amount,
      percentage: totalRevenueAllTime ? Math.round((b.amount / totalRevenueAllTime) * 100) : 0,
      color: colors[i] || '#94a3b8',
    }));

    // Monthly trend for last 6 months
    const last6Months = this.getLast6Months();
    const monthlyTrend: MonthlyTrend[] = [];

    for (const period of last6Months) {
      const deals = await this.dealModel.find({
        assignedTo: userId,
        DealStatus: 'won',
        createdAt: { $gte: period.start, $lte: period.end },
      }).exec();
      const revenue = deals.reduce((sum, d) => sum + (d.dealAmount || 0), 0);
      monthlyTrend.push({ 
        month: period.month, 
        revenue, 
        deals: deals.length 
      });
    }

    // Calculate overall achievement
    let totalWeighted = 0;
    let totalWeight = 0;
    targetsData.forEach(t => {
      const weight = t.unit === '₹' ? 4 : 1; // Revenue has 4x weight
      const achievement = t.target ? Math.min((t.actual / t.target) * 100, 100) : 0;
      totalWeighted += achievement * weight;
      totalWeight += weight;
    });
    const overallAchievement = totalWeight ? Math.round(totalWeighted / totalWeight) : 0;

    return {
      targetsData,
      activitySummary,
      topClients,
      revenueBreakdown,
      monthlyTrend,
      overallAchievement,
    };
  }
}