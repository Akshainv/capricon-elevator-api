import { Controller, Get, Post, Query, Redirect, Res, Logger, Body } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller('facebook')
export class FacebookController {
    private readonly logger = new Logger(FacebookController.name);

    constructor(private readonly facebookService: FacebookService) { }

    @Get('connect')
    async connect(@Query('userId') userId: string) {
        const url = await this.facebookService.getConnectUrl(userId);
        return { url };
    }

    @Get('callback')
    async callback(@Query('code') code: string, @Query('state') userId: string, @Res() res) {
        try {
            await this.facebookService.handleCallback(code, userId);
            // Redirect back to frontend
            return res.redirect('http://localhost:4200/meta-leads?status=success');
        } catch (error) {
            this.logger.error('Facebook callback error:', error.message);
            return res.redirect('http://localhost:4200/meta-leads?status=error');
        }
    }

    @Get('status')
    async getStatus(@Query('userId') userId: string) {
        return this.facebookService.getStatus(userId);
    }

    @Post('disconnect')
    async disconnect(@Query('userId') userId: string) {
        return this.facebookService.disconnect(userId);
    }

    @Get('sync')
    async sync(@Query('userId') userId: string) {
        return this.facebookService.syncLeads(userId);
    }

    @Get('webhook')
    verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
        const verifyToken = process.env.META_VERIFY_TOKEN || 'capricon_webhook_2025';
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        return 'Verification failed';
    }

    @Post('webhook')
    async handleWebhook(@Body() body: any) {
        return this.facebookService.handleWebhook(body);
    }
}
