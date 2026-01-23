import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('WEBHOOK_SECRET is not defined in environment variables');
            return false;
        }

        if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
            throw new UnauthorizedException('Invalid webhook secret');
        }

        return true;
    }
}
