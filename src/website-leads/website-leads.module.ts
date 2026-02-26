import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteLeadsController } from './website-leads.controller';
import { WebsiteLeadsService } from './website-leads.service';
import { WebsiteLead, WebsiteLeadSchema } from './schemas/website-lead.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WebsiteLead.name, schema: WebsiteLeadSchema },
        ]),
    ],
    controllers: [WebsiteLeadsController],
    providers: [WebsiteLeadsService],
    exports: [WebsiteLeadsService],
})
export class WebsiteLeadsModule { }
