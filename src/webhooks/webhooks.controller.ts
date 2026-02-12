import { Controller, Get, Post, Query, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks/meta')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Get()
    verify(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        return this.webhooksService.verifyWebhook(mode, token, challenge);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    handleEvent(
        @Headers('x-hub-signature-256') signature: string,
        @Body() payload: any,
    ) {
        return this.webhooksService.handleMetaEvent(signature, payload);
    }
}
