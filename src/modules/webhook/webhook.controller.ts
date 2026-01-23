import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';

@Controller('webhook')
@UseGuards(WebhookAuthGuard)
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Post('revenuecat')
    async handleRevenueCatWebhook(@Body() payload: RevenueCatWebhookDto) {
        return this.webhookService.handleRevenueCatWebhook(payload);
    }
}
