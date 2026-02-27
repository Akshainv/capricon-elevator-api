import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { WebsiteLeadsService } from './website-leads.service';

@Controller('api/leads')
export class WordPressLeadsController {
    constructor(private readonly websiteLeadsService: WebsiteLeadsService) { }

    @Post('website')
    async createWebsiteLead(@Body() body: any) {
        console.log('🚀 POST /api/leads/website hit with body:', JSON.stringify(body, null, 2));
        return this.websiteLeadsService.createWebsiteLead(body);
    }
}
