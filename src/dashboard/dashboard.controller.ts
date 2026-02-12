// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import * as jwt from 'jsonwebtoken';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Extract user data from JWT token
   */
  private extractUserFromToken(authHeader: string): { userId: string; role: string } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header or invalid format');
      return null;
    }

    try {
      const token = authHeader.substring(7);
      const decoded: any = jwt.decode(token);
      
      console.log('🔍 Decoded JWT token:', JSON.stringify(decoded, null, 2));
      
      const userId = decoded?.userId || decoded?.sub || decoded?.id || decoded?._id || null;
      const role = decoded?.role || 'employee';
      
      console.log('✅ Extracted user ID:', userId);
      console.log('✅ Extracted role:', role);
      
      return { userId, role };
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  }

  /**
   * ✅ ADMIN DASHBOARD ENDPOINT
   * Returns: Deals (Deal Pipeline), Projects (Project List), Leads (Lead List)
   * No user filtering - returns company-wide totals
   */
  @Get('admin')
  async getAdminDashboard(
    @Headers('authorization') authHeader: string,
    @Query() filter: DashboardFilterDto
  ) {
    try {
      console.log('='.repeat(80));
      console.log('📊 ADMIN DASHBOARD REQUEST');
      console.log('='.repeat(80));
      
      // Verify user is admin
      const user = this.extractUserFromToken(authHeader);
      
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }

      console.log('👤 Requesting User ID:', user.userId);
      console.log('🔐 Requesting User Role:', user.role);
      
      if (user.role !== 'admin') {
        console.log('❌ ACCESS DENIED: User is not admin');
        throw new UnauthorizedException('Admin access required');
      }

      console.log('✅ Admin access verified - loading global dashboard data');
      console.log('🔍 Filter:', filter);
      
      const data = await this.dashboardService.getAdminOverview(filter);
      
      console.log('✅ Admin dashboard data loaded:');
      console.log('  - Total Deals:', data.totalDeals.value);
      console.log('  - Total Projects:', data.totalProjects.value);
      console.log('  - Total Leads:', data.totalLeads.value);
      console.log('='.repeat(80));
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in admin dashboard:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      return { 
        success: false, 
        message: error.message || 'Failed to load admin dashboard',
        data: null 
      };
    }
  }

  /**
   * ✅ SALES DASHBOARD ENDPOINT
   * Returns: My Quotations, My Leads, My Projects
   * Filtered by userId - returns only user-specific data
   */
  @Get('sales')
  async getSalesDashboard(
    @Headers('authorization') authHeader: string,
    @Query() filter: DashboardFilterDto
  ) {
    try {
      console.log('='.repeat(80));
      console.log('📊 SALES DASHBOARD REQUEST');
      console.log('='.repeat(80));
      
      const user = this.extractUserFromToken(authHeader);

      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }

      console.log('👤 Sales dashboard for user:', user.userId);
      console.log('🔐 User role:', user.role);
      console.log('🔍 Filter:', filter);

      const data = await this.dashboardService.getSalesExecutiveDashboard(user.userId, filter);
      
      console.log('✅ Sales dashboard data loaded');
      console.log('='.repeat(80));
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in sales dashboard:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      return { 
        success: false, 
        message: error.message || 'Failed to load sales dashboard',
        data: null 
      };
    }
  }
}