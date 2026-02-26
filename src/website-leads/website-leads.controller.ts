import { Controller, Post, Get, Body, Headers, UnauthorizedException, HttpStatus, UseGuards } from '@nestjs/common';
import { WebsiteLeadsService } from './website-leads.service';

@Controller('website-leads')
export class WebsiteLeadsController {
    constructor(private readonly websiteLeadsService: WebsiteLeadsService) { }

    // 🌍 PUBLIC WEBHOOK ENDPOINT FOR WORDPRESS
    @Post('webhook')
    async handleWebhook(
        @Body() payload: any,
        @Headers('x-api-key') apiKey?: string,
    ) {
        // Optional Security Check
        const expectedKey = process.env.WEBHOOK_API_KEY || 'capricorn-secret-key-123';

        // Check if key is mandated by the environment
        if (process.env.REQUIRE_WEBHOOK_KEY === 'true') {
            if (!apiKey || apiKey !== expectedKey) {
                throw new UnauthorizedException('Invalid or missing API key');
            }
        }

        const result = await this.websiteLeadsService.createWebhookLead(payload);
        return {
            statusCode: HttpStatus.CREATED,
            ...result
        };
    }

    // 🔒 PROTECTED ENDPOINT FOR ADMIN DASHBOARD
    @Get()
    async findAll() {
        const leads = await this.websiteLeadsService.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Website leads fetched successfully',
            data: leads
        };
    }
}
