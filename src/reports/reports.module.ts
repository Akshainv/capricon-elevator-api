// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DealSchema } from '../deal/schemas/deal.schema';
import { QuotationSchema } from '../quotation/schemas/quotation.schema';
import { ProjectSchema } from '../projects/schemas/project.schema';
import { EmployeeSchema } from '../employee/schemas/employeeSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'deal', schema: DealSchema },
      { name: 'Quotation', schema: QuotationSchema },
      { name: 'Project', schema: ProjectSchema },
      { name: 'Employee', schema: EmployeeSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}