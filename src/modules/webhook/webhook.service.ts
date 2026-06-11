import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, isValidObjectId } from 'mongoose';
import { User } from '../../models/user.schema';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { Role } from 'src/common/enums/role.enum';
import { UserService } from '../user/user.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async handleRevenueCatWebhook(payload: RevenueCatWebhookDto) {
    const isBetaMode = this.configService.get<string>('BETA_MODE') === 'true';

    if (isBetaMode) {
      this.logger.log('Beta modu aktif - webhook işlenmedi');
      return { message: 'Beta modu - webhook atlandı' };
    }

    const { event } = payload;
    const userId = event.app_user_id;
    this.logger.log(
      `Received RevenueCat webhook event: ${event.type} for user: ${userId}`,
    );

    const user = await this.userModel.findById(userId);

    if (!user) {
      this.logger.error(
        `User not found for identifiers: ${JSON.stringify(userId)}`,
      );
      throw new NotFoundException(`User not found`);
    }

    if (event.type === 'TEST') {
      this.logger.log('Test event received. Skipping database update.');
      return { message: 'Test event processed' };
    }

    const updateData: Partial<User> = {
      subscriptionExpiresAt: new Date(event.expiration_at_ms),
    };

    if (event.expiration_at_ms > Date.now()) {
      updateData.role = Role.PremiumUser;

      await this.userModel.findByIdAndUpdate(user._id, updateData);

      this.logger.log(
        `Updated user ${user._id} subscription. Expires at: ${updateData.subscriptionExpiresAt}`,
      );

      // Transaction logla
      await this.userService.addTransaction(user._id.toString(), {
        type: 'subscription_renewal',
        description: 'Abonelik yenilendi/satın alındı',
        amount: event.price_in_purchased_currency,
        currency: event.currency,
        event_id: event.id,
        period_type: event.period_type,
        expiration_at: updateData.subscriptionExpiresAt,
      });

      return { success: true };
    }
  }
}
