import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
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

    getPrivacyPolicyHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Capricon CRM</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #2c3e50; margin-top: 30px; }
        .footer { margin-top: 50px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for Capricon CRM</h1>
    <p>Last updated: February 23, 2026</p>

    <p>At Capricon CRM, accessible from our application, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Capricon CRM and how we use it.</p>

    <h2>1. Information We Collect</h2>
    <p>We only collect information about you if we have a reason to do so—for example, to provide our services, to communicate with you, or to make our services better. This includes Lead data synced from your Facebook Pages (names, emails, and phone numbers) if you choose to connect your Meta account.</p>

    <h2>2. How We Use Your Information</h2>
    <p>We use the information we collect to provide, operate, and maintain our CRM, including syncing leads from social media platforms to help you manage your sales pipeline efficiently.</p>

    <h2>3. Data Deletion</h2>
    <p>Users can request the deletion of their data at any time. If you have connected your Meta account, you can remove the application through your Facebook settings. When you do so, you can request that Meta notify us to delete your data. Alternatively, you can contact us directly at developer.inspitetech@gmail.com to request data deletion.</p>

    <h2>4. Contact Us</h2>
    <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at developer.inspitetech@gmail.com.</p>

    <div class="footer">
        &copy; 2026 Capricon CRM. All rights reserved.
    </div>
</body>
</html>`;
    }

    async handleDataDeletion(signedRequest: string) {
        try {
            const appSecret = this.configService.get('META_APP_SECRET');
            const [encodedSig, payload] = signedRequest.split('.');

            // Decode the signature
            const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
            // Decode the payload
            const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

            // Verify the signature
            const expectedSig = crypto.createHmac('sha256', appSecret)
                .update(payload)
                .digest();

            if (!crypto.timingSafeEqual(sig, expectedSig)) {
                this.logger.error('Invalid signature in Facebook data deletion request');
                throw new Error('Invalid signature');
            }

            this.logger.log(`Data deletion requested for Facebook User ID: ${data.user_id}`);

            // Return the required response
            return {
                url: `${this.configService.get('APP_URL')}/facebook/privacy-policy`,
                confirmation_code: `DEL_${data.user_id}_${Date.now()}`,
            };
        } catch (error) {
            this.logger.error('Error handling Facebook data deletion:', error.message);
            throw error;
        }
    }
}
