import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { LeadService } from '../lead/lead.service';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private readonly leadService: LeadService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    verifyWebhook(mode: string, token: string, challenge: string): string | null {
        const verifyToken = process.env.META_VERIFY_TOKEN || 'capricon_crm_webhook_verify';

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('✅ Meta Webhook verified successfully');
            return challenge;
        }
        this.logger.warn('❌ Meta Webhook verification failed');
        return null;
    }

    handleMetaEvent(signature: string, payload: any) {
        // Verify signature if APP_SECRET is provided
        if (signature && process.env.META_APP_SECRET) {
            if (!this.verifySignature(signature, payload)) {
                this.logger.error('❌ Invalid Meta Webhook signature');
                return { status: 'error', message: 'Invalid signature' };
            }
        }

        this.logger.log('📩 Received Meta Webhook event');

        // Process lead generation or WhatsApp events
        if (payload.object === 'page') {
            this.handleFacebookPageEvent(payload);
        } else if (payload.object === 'whatsapp_business_account') {
            this.handleWhatsAppEvent(payload);
        }

        return { status: 'received' };
    }

    private verifySignature(signature: string, payload: any): boolean {
        const secret = process.env.META_APP_SECRET || '';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Facebook signatures come in the format 'sha256=...'
        const actualSignature = signature.replace('sha256=', '');
        return crypto.timingSafeEqual(Buffer.from(actualSignature), Buffer.from(expectedSignature));
    }

    private async handleFacebookPageEvent(payload: any) {
        const entries = payload.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === 'leadgen') {
                    const leadgenId = change.value.leadgen_id;
                    this.logger.log(`🎯 New Lead Ad detected: ${leadgenId}`);
                    await this.processLeadAd(leadgenId);
                }
            }
        }
    }

    private async processLeadAd(leadgenId: string) {
        const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (!accessToken) {
            this.logger.error('❌ META_PAGE_ACCESS_TOKEN is missing in .env. Cannot fetch lead details.');
            return;
        }

        try {
            const response = await fetch(`https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`);
            const data: any = await response.json();

            if (data.error) {
                this.logger.error(`❌ Meta Graph API Error: ${data.error.message}`);
                return;
            }

            // Map Meta fields to CRM Lead fields
            // Standard field names in Meta: full_name, email, phone_number
            // We search for variations to be robust
            const getFieldValue = (fieldData: any[], possibleNames: string[]): string => {
                for (const name of possibleNames) {
                    const field = fieldData.find(f => f.name === name);
                    if (field && field.values && field.values.length > 0) {
                        return field.values[0];
                    }
                }
                return '';
            };

            const fieldDataArray = data.field_data || [];
            const fullName = getFieldValue(fieldDataArray, ['full_name', 'name', 'first_name']) || 'Meta Lead';
            const email = getFieldValue(fieldDataArray, ['email']) || `lead_${leadgenId}@meta.com`;
            const phoneNumber = getFieldValue(fieldDataArray, ['phone_number', 'phone']) || '0000000000';

            this.logger.log(`📝 Creating lead for: ${fullName} (${email})`);

            // Find an admin user to be the 'creator'
            const admin = await this.userModel.findOne({ role: 'admin' }).select('_id').exec();
            const creatorId = admin ? admin._id.toString() : 'system';

            await this.leadService.createLead({
                fullName,
                email,
                phoneNumber,
                companyName: 'Meta Lead Ad',
                leadSource: 'Social Media',
                assignedTo: '', // Leave unassigned for now
                createdBy: creatorId,
                notes: `Meta Leadgen ID: ${leadgenId} | Platform: Facebook | Campaign: ${data.campaign_name || 'N/A'}`,
                priority: 'medium'
            });

            this.logger.log(`✅ Lead created successfully for ${fullName}`);
        } catch (error) {
            this.logger.error('❌ Error processing Meta lead:', error);
        }
    }

    private handleWhatsAppEvent(payload: any) {
        this.logger.log('处理 WhatsApp 事件');
        // Implementation for WhatsApp messaging integration
    }
}
