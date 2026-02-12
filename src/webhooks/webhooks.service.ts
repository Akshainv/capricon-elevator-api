import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

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
                return;
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

    private handleFacebookPageEvent(payload: any) {
        this.logger.log('处理 Facebook Page 事件');
        // Implementation for Lead Ads integration
    }

    private handleWhatsAppEvent(payload: any) {
        this.logger.log('处理 WhatsApp 事件');
        // Implementation for WhatsApp messaging integration
    }
}
