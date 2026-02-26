import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import mongoose from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Quotation, QuotationSchema } from './schemas/quotation.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quotation.name, schema: QuotationSchema },
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [MongooseModule], // ← ADD THIS LINE
})
export class QuotationModule { }