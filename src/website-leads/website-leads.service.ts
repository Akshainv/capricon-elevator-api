import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebsiteLead, WebsiteLeadDocument } from './schemas/website-lead.schema';

@Injectable()
export class WebsiteLeadsService {
    constructor(
        @InjectModel(WebsiteLead.name) private websiteLeadModel: Model<WebsiteLeadDocument>
    ) { }

    async createWebhookLead(data: any) {
        try {
            // Clean up keys matching Contact Form 7 or standard formats
            const mappedData = {
                name: data['your-name'] || data.name || data.Name || data.firstName || 'Unknown',
                email: data['your-email'] || data.email || data.Email || '',
                phone: data['tel-735'] || data.phone || data.Phone || data.phoneNumber || '',
                elevatorType: data['select-575'] || data.elevatorType || data.type || '',
                message: data['your-message'] || data.message || data.Message || data.body || '',
                source: 'Landing Page Form'
            };

            console.log('🌐 Received Website Webhook Data mapped to:', mappedData);

            // Save to database
            const newLead = await this.websiteLeadModel.create(mappedData);

            return {
                message: 'Lead captured successfully',
                leadId: newLead._id
            };
        } catch (error) {
            console.error('❌ Failed to process website webhook:', error);
            throw new HttpException('Failed to process lead', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findAll() {
        return this.websiteLeadModel.find().sort({ createdAt: -1 }).exec();
    }
}
