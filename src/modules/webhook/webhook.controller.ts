import { Body, Controller, Headers, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Public()
    @Post('revenuecat')
    @UseGuards(WebhookAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    async handleRevenueCatWebhook(@Body() payload: RevenueCatWebhookDto) {
        return this.webhookService.handleRevenueCatWebhook(payload);
    }

    /**
     * Rezervem → POST /webhook/rezervem
     * HMAC-SHA256 imzası X-Webhook-Signature header'ında gelir.
     * REZERVEM_WEBHOOK_SECRET env var tanımlıysa doğrulama yapılır.
     */
    @Public()
    @Post('rezervem')
    @ApiOperation({ summary: 'Rezervem webhook bildirimleri (rezervasyon durumu güncellemeleri)' })
    async handleRezervemWebhook(
        @Req() req: any,
        @Body() payload: any,
        @Headers('x-webhook-signature') signature: string,
        @Headers('x-webhook-event-id') eventId: string,
        @Headers('x-webhook-timestamp') timestamp: string,
    ) {
        return this.webhookService.handleRezervemWebhook({
            payload,
            rawBody: req.rawBody as Buffer,
            signature,
            eventId,
            timestamp,
        });
    }
}
