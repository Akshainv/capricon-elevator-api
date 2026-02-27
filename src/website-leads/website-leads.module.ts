import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteLeadsController } from './website-leads.controller';
import { WordPressLeadsController } from './wordpress-leads.controller';
import { WebsiteLeadsService } from './website-leads.service';
import { WebsiteLead, WebsiteLeadSchema } from './schemas/website-lead.schema';
import { Lead, LeadSchema } from '../lead/schemas/lead.schema';
import { assignLead, AssignLeadSchema } from '../lead/schemas/assign.lead.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Employee, EmployeeSchema } from '../employee/schemas/employeeSchema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WebsiteLead.name, schema: WebsiteLeadSchema },
            { name: Lead.name, schema: LeadSchema },
            { name: assignLead.name, schema: AssignLeadSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
        NotificationsModule,
    ],
    controllers: [WebsiteLeadsController, WordPressLeadsController],
    providers: [WebsiteLeadsService],
    exports: [WebsiteLeadsService],
})
export class WebsiteLeadsModule { }
