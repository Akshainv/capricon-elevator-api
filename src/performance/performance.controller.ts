import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { PerformanceService, PerformanceResponse } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('my')
  async getMyPerformance(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('userId') queryUserId?: string, // ← Accept userId from query for testing
  ): Promise<PerformanceResponse> {
    // Try to get from authenticated user first, fall back to query param
    const userId = req.user?.userId || req.user?.id || req.user?.sub || req.user?._id || queryUserId;
    
    if (!userId) {
      throw new BadRequestException('userId is required as query parameter or via authentication');
    }

    return this.performanceService.getSalesPerformance(userId, month);
  }
}