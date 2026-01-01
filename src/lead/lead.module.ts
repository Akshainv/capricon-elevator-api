import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { assignLead, AssignLeadSchema } from './schemas/assign.lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema },{ name: assignLead.name, schema: AssignLeadSchema }]),
  ],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
