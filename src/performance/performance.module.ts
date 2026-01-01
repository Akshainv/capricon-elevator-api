import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { DealModule } from '../deal/deal.module';
import { QuotationModule } from '../quotation/quotation.module';

@Module({
  imports: [
    DealModule,      // Import the module that exports the models
    QuotationModule, // Import the module that exports the models
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}