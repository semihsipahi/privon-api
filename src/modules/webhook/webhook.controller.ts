import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('webhook')
@UseGuards(WebhookAuthGuard)
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Public()
    @Post('revenuecat')
    async handleRevenueCatWebhook(@Body() payload: RevenueCatWebhookDto) {
        return this.webhookService.handleRevenueCatWebhook(payload);
    }
}
