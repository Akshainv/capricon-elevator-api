import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { assignLead, AssignLeadSchema } from './schemas/assign.lead.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: assignLead.name, schema: AssignLeadSchema },
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule { }
