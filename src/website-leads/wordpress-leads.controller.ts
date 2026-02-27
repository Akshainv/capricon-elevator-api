import { Controller, Post, Body, Req } from '@nestjs/common';
import { WebsiteLeadsService } from './website-leads.service';
import * as express from 'express';

@Controller('api/leads')
export class WordPressLeadsController {
    constructor(private readonly websiteLeadsService: WebsiteLeadsService) { }

    @Post('website')
    async createWebsiteLead(@Body() body: any, @Req() req: express.Request) {
        console.log('--- 🚀 Incoming Request to /api/leads/website ---');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(body, null, 2));

        return this.websiteLeadsService.createWebsiteLead(body);
    }
}


