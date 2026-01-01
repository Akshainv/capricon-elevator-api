import { Module } from '@nestjs/common';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { deal, DealSchema } from './schemas/deal.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: deal.name, schema: DealSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [DealController],
  providers: [DealService],
  exports: [MongooseModule],
})
export class DealModule {}