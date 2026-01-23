import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { User } from '../../models/user.schema';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    async handleRevenueCatWebhook(payload: RevenueCatWebhookDto) {
        const { event } = payload;
        this.logger.log(`Received RevenueCat webhook event: ${event.type} for user: ${event.app_user_id}`);

        const possibleUserIds = (event.aliases || [])
            .filter((id) => id && isValidObjectId(id));

        let user = null;
        for (const userId of possibleUserIds) {
            user = await this.userModel.findById(userId);
            if (user) break;
        }

        if (!user) {
            this.logger.error(`User not found for identifiers: ${JSON.stringify(possibleUserIds)}`);
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

            this.logger.log(`Updated user ${user._id} subscription. Expires at: ${updateData.subscriptionExpiresAt}`);

            return { success: true };
        }
    }
}
