import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Lead, LeadDocument } from '../lead/schemas/lead.schema';

@Injectable()
export class FacebookService {
    private readonly logger = new Logger(FacebookService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    ) { }

    async getConnectUrl(userId: string): Promise<string> {
        const appId = this.configService.get('META_APP_ID');
        const redirectUri = `${this.configService.get('APP_URL')}/facebook/callback`;
        return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${userId}&scope=public_profile,email,leads_retrieval,pages_show_list,pages_read_engagement,pages_manage_ads`;
    }

    async handleCallback(code: string, userId: string) {
        const appId = this.configService.get('META_APP_ID');
        const appSecret = this.configService.get('META_APP_SECRET');
        const redirectUri = `${this.configService.get('APP_URL')}/facebook/callback`;

        const tokenRes = await firstValueFrom(
            this.httpService.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code,
                },
            }),
        );

        const userAccessToken = tokenRes.data.access_token;

        const pagesRes = await firstValueFrom(
            this.httpService.get(`https://graph.facebook.com/v18.0/me/accounts`, {
                params: { access_token: userAccessToken },
            }),
        );

        const page = pagesRes.data.data[0];
        if (!page) {
            throw new Error('No Facebook pages found for this user');
        }

        await this.userModel.findByIdAndUpdate(userId, {
            facebookConnected: true,
            facebookAccessToken: page.access_token,
            facebookPageId: page.id,
            facebookPageName: page.name,
        });

        return { success: true, pageName: page.name };
    }

    async getStatus(userId: string) {
        const user = await this.userModel.findById(userId);
        return {
            connected: user?.facebookConnected || false,
            pageName: user?.facebookPageName || '',
        };
    }

    async disconnect(userId: string) {
        await this.userModel.findByIdAndUpdate(userId, {
            facebookConnected: false,
            facebookAccessToken: null,
            facebookPageId: null,
            facebookPageName: null,
        });
        return { success: true };
    }

    async handleWebhook(body: any) {
        this.logger.log('Received Facebook Webhook:', JSON.stringify(body));

        if (body.object === 'page') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const { leadgen_id, page_id } = change.value;
                        await this.processLead(leadgen_id, page_id);
                    }
                }
            }
        }
    }

    async processLead(leadId: string, pageId: string) {
        try {
            const user = await this.userModel.findOne({ facebookPageId: pageId });
            if (!user || !user.facebookAccessToken) {
                this.logger.error(`No user found for Facebook Page ID: ${pageId}`);
                return;
            }

            const leadRes = await firstValueFrom(
                this.httpService.get(`https://graph.facebook.com/v18.0/${leadId}`, {
                    params: { access_token: user.facebookAccessToken },
                }),
            );

            const fbLead = leadRes.data;
            const fieldData = fbLead.field_data || [];
            const leadData: any = {
                fullName: this.getFieldValue(fieldData, ['full_name', 'name', 'first_name']),
                email: this.getFieldValue(fieldData, ['email']),
                phoneNumber: this.getFieldValue(fieldData, ['phone_number', 'phone']),
                isFacebookLead: true,
                facebookLeadId: leadId,
                facebookFormId: fbLead.form_id,
                leadSource: 'Social Media',
                status: 'Seeded Lead',
                createdBy: user._id,
            };

            const existingLead = await this.leadModel.findOne({ facebookLeadId: leadId });
            if (existingLead) {
                this.logger.log(`Lead ${leadId} already exists, skipping.`);
                return;
            }

            await new this.leadModel(leadData).save();
            this.logger.log(`Successfully saved Facebook lead: ${leadData.email}`);

        } catch (error) {
            this.logger.error(`Error processing Facebook lead ${leadId}:`, error.message);
        }
    }

    private getFieldValue(fieldData: any[], possibleNames: string[]): string {
        for (const name of possibleNames) {
            const field = fieldData.find(f => f.name === name);
            if (field && field.values && field.values.length > 0) {
                return field.values[0];
            }
        }
        return 'Unknown';
    }

    async syncLeads(userId: string) {
        const user = await this.userModel.findById(userId);
        if (!user || !user.facebookAccessToken || !user.facebookPageId) {
            throw new Error('Facebook not connected');
        }

        const formsRes = await firstValueFrom(
            this.httpService.get(`https://graph.facebook.com/v18.0/${user.facebookPageId}/leadgen_forms`, {
                params: { access_token: user.facebookAccessToken },
            }),
        );

        const forms = formsRes.data.data || [];
        let syncedCount = 0;

        for (const form of forms) {
            const leadsRes = await firstValueFrom(
                this.httpService.get(`https://graph.facebook.com/v18.0/${form.id}/leads`, {
                    params: { access_token: user.facebookAccessToken },
                }),
            );

            const leads = leadsRes.data.data || [];
            for (const lead of leads) {
                await this.processLead(lead.id, user.facebookPageId);
                syncedCount++;
            }
        }

        return { success: true, count: syncedCount };
    }
}
