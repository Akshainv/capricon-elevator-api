// src/dashboard/dashboard.module.ts - UPDATED
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// Import all required schemas
import { deal, DealSchema } from '../deal/schemas/deal.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Lead, LeadSchema } from '../lead/schemas/lead.schema';
import { Quotation,QuotationSchema } from 'src/quotation/schemas/quotation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: deal.name, schema: DealSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Quotation.name, schema: QuotationSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}