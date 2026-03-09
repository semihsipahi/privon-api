import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../../models/notification.schema';
import { NotificationStatus } from '../../models/notification-status.schema';
import { SendGeneralNotificationDto } from './dto/send-notification.dto';
import { User } from '../../models/user.schema';

interface OneSignalPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
    url?: string;
    buttons?: Array<{ id: string; text: string; icon?: string }>;
}

export interface NotificationAnalytics {
    id: string;
    successful: number;
    failed: number;
    errored: number;
    converted: number;
    received: number;
    remaining: number;
    queued_at: number;
    send_after: number;
    completed_at: number;
    headings: Record<string, string>;
    contents: Record<string, string>;
    platform_delivery_stats?: {
        ios?: PlatformStats;
        android?: PlatformStats;
        web?: PlatformStats;
    };
}

export interface PlatformStats {
    successful: number;
    failed: number;
    errored: number;
    converted: number;
    received: number;
}

export interface NotificationListResponse {
    total_count: number;
    offset: number;
    limit: number;
    notifications: NotificationAnalytics[];
}

interface OneSignalResponse {
    id: string;
    external_id?: string;
    errors?: {
        invalid_aliases?: {
            external_id?: string[];
        };
    };
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly oneSignalAppId: string;
    private readonly oneSignalApiKey: string;
    private readonly oneSignalApiUrl = 'https://api.onesignal.com/notifications';

    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<Notification>,
        @InjectModel(NotificationStatus.name)
        private notificationStatusModel: Model<NotificationStatus>,
        @InjectModel(User.name) private userModel: Model<User>,
        private configService: ConfigService,
    ) {
        this.oneSignalAppId = this.configService.get<string>('ONESIGNAL_APP_ID') || '';
        this.oneSignalApiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY') || this.configService.get<string>('ONESIGNAL_API_KEY') || '';
    }

    async findByUserId(userId: string, limit = 50): Promise<any[]> {
        const userObjectId = new Types.ObjectId(userId);
        const statusCollectionName = this.notificationStatusModel.collection.name;

        const user = await this.userModel.findById(userId).select('createdAt').exec();
        const userCreatedAt = (user as any)?.createdAt || new Date(0);

        return this.notificationModel.aggregate([
            {
                $match: {
                    $or: [{ type: 'global' }, { targetUserId: userObjectId }],
                    createdAt: { $gte: userCreatedAt },
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: statusCollectionName,
                    let: { notificationId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$notificationId', '$$notificationId'] },
                                        { $eq: ['$userId', userObjectId] },
                                    ],
                                },
                            },
                        },
                        { $project: { isRead: 1, isDeleted: 1 } },
                    ],
                    as: 'status',
                },
            },
            {
                $unwind: {
                    path: '$status',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    'status.isDeleted': { $ne: true },
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    body: 1,
                    data: 1,
                    type: 1,
                    createdAt: 1,
                    targetUserId: 1,
                    isRead: { $ifNull: ['$status.isRead', false] },
                    isClicked: { $ifNull: ['$status.isClicked', false] },
                },
            },
        ]);
    }

    async getUnreadCount(userId: string): Promise<number> {
        const userObjectId = new Types.ObjectId(userId);

        const user = await this.userModel.findById(userId).select('createdAt').exec();
        const userCreatedAt = (user as any)?.createdAt || new Date(0);

        const totalPotential = await this.notificationModel.countDocuments({
            $or: [{ type: 'global' }, { targetUserId: userObjectId }],
            createdAt: { $gte: userCreatedAt },
        });

        const interactedCount = await this.notificationStatusModel.countDocuments({
            userId: userObjectId,
            $or: [{ isRead: true }, { isDeleted: true }],
        });

        return Math.max(0, totalPotential - interactedCount);
    }

    async markAsRead(notificationId: string, userId: string): Promise<any> {
        return this.notificationStatusModel.findOneAndUpdate(
            {
                notificationId: new Types.ObjectId(notificationId),
                userId: new Types.ObjectId(userId),
            },
            { $set: { isRead: true } },
            { upsert: true, new: true },
        );
    }

    async sendNotification(
        payload: SendGeneralNotificationDto,
    ): Promise<{ success: boolean; count: number; oneSignalId?: string }> {
        const { userIds, title, body, data } = payload;

        const isBroadcast = !userIds || userIds.length === 0;

        let targetUsers: { _id: Types.ObjectId }[] = [];

        if (!isBroadcast) {
            const users = await this.userModel
                .find(
                    { _id: { $in: userIds }, 'notification.app': true, isActive: true },
                    { _id: 1 },
                )
                .lean()
                .exec();
            targetUsers = users as any;
        }

        if (!isBroadcast && targetUsers.length === 0) {
            return { success: true, count: 0 };
        }

        // Create notification records
        let createdNotification: any = null;

        if (isBroadcast) {
            // Snapshot total user count for accurate historical stats
            const totalUsers = await this.userModel.countDocuments({ isActive: true });

            createdNotification = await this.notificationModel.create({
                type: 'global',
                title,
                body,
                data,
                userCount: totalUsers,
            });
        } else {
            const notificationsToCreate = targetUsers.map((user) => ({
                type: 'personal',
                targetUserId: user._id,
                title,
                body,
                data,
            }));
            await this.notificationModel.insertMany(notificationsToCreate);
        }

        // Send push notifications
        let oneSignalId: string | undefined;

        if (isBroadcast) {
            const result = await this.sendBroadcastPush({ title, body, data });
            oneSignalId = result?.id;

            // Update global notification with OneSignal ID
            if (oneSignalId && createdNotification) {
                await this.notificationModel.updateOne(
                    { _id: createdNotification._id },
                    { oneSignalId },
                );
            }
        } else {
            const validExternalIds = targetUsers
                .map((u) => u._id.toString()) // Using _id as external_id usually unless you really have firebaseUid here
                .filter((uid): uid is string => !!uid);

            if (validExternalIds.length > 0) {
                const result = await this.sendTargetedPush(validExternalIds, {
                    title,
                    body,
                    data,
                });
                oneSignalId = result?.id;
            }
        }

        return {
            success: true,
            count: isBroadcast ? -1 : targetUsers.length,
            oneSignalId,
        };
    }

    private async sendBroadcastPush(
        payload: OneSignalPayload,
    ): Promise<OneSignalResponse | null> {
        if (!this.isOneSignalConfigured()) return null;

        try {
            const response = await fetch(this.oneSignalApiUrl, {
                method: 'POST',
                headers: this.getOneSignalHeaders(),
                body: JSON.stringify({
                    app_id: this.oneSignalAppId,
                    included_segments: ['Total Subscriptions'],
                    headings: { en: payload.title },
                    contents: { en: payload.body },
                    data: payload.data || {},
                    ...(payload.url && { url: payload.url }),
                    ...(payload.buttons && { buttons: payload.buttons }),
                }),
            });

            return this.handleOneSignalResponse(response, 'Broadcast');
        } catch (error) {
            this.logger.error('Failed to send OneSignal broadcast', error);
            return null;
        }
    }

    private async sendTargetedPush(
        externalIds: string[],
        payload: OneSignalPayload,
    ): Promise<OneSignalResponse | null> {
        if (!this.isOneSignalConfigured()) return null;

        const BATCH_SIZE = 20000;
        let lastResponse: OneSignalResponse | null = null;

        for (let i = 0; i < externalIds.length; i += BATCH_SIZE) {
            const batch = externalIds.slice(i, i + BATCH_SIZE);

            try {
                const response = await fetch(this.oneSignalApiUrl, {
                    method: 'POST',
                    headers: this.getOneSignalHeaders(),
                    body: JSON.stringify({
                        app_id: this.oneSignalAppId,
                        include_aliases: {
                            external_id: batch,
                        },
                        target_channel: 'push',
                        headings: { en: payload.title },
                        contents: { en: payload.body },
                        data: payload.data || {},
                        ...(payload.url && { url: payload.url }),
                        ...(payload.buttons && { buttons: payload.buttons }),
                    }),
                });

                lastResponse = await this.handleOneSignalResponse(
                    response,
                    `Targeted batch ${Math.floor(i / BATCH_SIZE) + 1}`,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to send OneSignal batch ${Math.floor(i / BATCH_SIZE) + 1}`,
                    error,
                );
            }
        }

        return lastResponse;
    }

    async sendPushToUser(
        externalId: string,
        payload: OneSignalPayload,
    ): Promise<OneSignalResponse | null> {
        return this.sendTargetedPush([externalId], payload);
    }

    private isOneSignalConfigured(): boolean {
        if (!this.oneSignalAppId || !this.oneSignalApiKey) {
            this.logger.warn('OneSignal not configured - skipping push notification');
            return false;
        }
        return true;
    }

    private getOneSignalHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            // New API uses "Key" prefix instead of "Basic"
            Authorization: `Key ${this.oneSignalApiKey}`,
        };
    }

    private async handleOneSignalResponse(
        response: Response,
        context: string,
    ): Promise<OneSignalResponse | null> {
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`OneSignal ${context} error: ${errorText}`);
            return null;
        }

        const result: OneSignalResponse = await response.json();

        // Check for empty ID (message not sent)
        if (result.id === '') {
            this.logger.warn(`OneSignal ${context}: No recipients found`);
            return result;
        }

        // Log any partial failures
        if (result.errors?.invalid_aliases?.external_id?.length) {
            this.logger.warn(
                `OneSignal ${context}: ${result.errors.invalid_aliases.external_id.length} invalid aliases`,
            );
        }

        this.logger.log(`OneSignal ${context} sent successfully: ${result.id}`);
        return result;
    }

    async deleteByUser(notificationId: string, userId: string): Promise<any> {
        return this.notificationStatusModel.findOneAndUpdate(
            {
                notificationId: new Types.ObjectId(notificationId),
                userId: new Types.ObjectId(userId),
            },
            { $set: { isDeleted: true } },
            { upsert: true, new: true },
        );
    }

    async deleteAllByUser(userId: string): Promise<{ deletedCount: number }> {
        const all = await this.findByUserId(userId, 1000);

        if (all.length === 0) {
            return { deletedCount: 0 };
        }

        const operations = all.map((n) => ({
            updateOne: {
                filter: {
                    notificationId: n._id,
                    userId: new Types.ObjectId(userId),
                },
                update: { $set: { isDeleted: true } },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            await this.notificationStatusModel.bulkWrite(operations);
        }

        return { deletedCount: operations.length };
    }

    async findAllWithStats(query: any) {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        // Fetch notifications directly from OneSignal API
        const result = await this.getNotificationsAnalytics({
            limit,
            offset,
            kind: 1, // Only API-sent notifications
        });

        if (!result) {
            return {
                data: [],
                meta: {
                    total: 0,
                    page: Number(page),
                    lastPage: 1,
                },
            };
        }

        // Transform OneSignal notifications to our format
        const notifications = result.notifications.map((notification) => ({
            id: notification.id,
            title: notification.headings?.en || notification.headings?.tr || '',
            body: notification.contents?.en || notification.contents?.tr || '',
            createdAt: new Date(notification.queued_at * 1000),
            completedAt: notification.completed_at
                ? new Date(notification.completed_at * 1000)
                : null,
            stats: {
                sentCount: notification.successful,
                deliveredCount: notification.received,
                clickedCount: notification.converted,
                failedCount: notification.failed + notification.errored,
                remainingCount: notification.remaining,
            },
            platformStats: notification.platform_delivery_stats || null,
        }));

        return {
            data: notifications,
            meta: {
                total: result.total_count,
                page: Number(page),
                lastPage: Math.ceil(result.total_count / limit),
            },
        };
    }

    async markAsClicked(notificationId: string, userId: string): Promise<any> {
        return this.notificationStatusModel.findOneAndUpdate(
            {
                notificationId: new Types.ObjectId(notificationId),
                userId: new Types.ObjectId(userId),
            },
            { isClicked: true, isRead: true },
            { upsert: true, new: true },
        );
    }

    // --- Analytics Methods ---

    /**
     * Get analytics for a single notification
     */
    async getNotificationAnalytics(
        notificationId: string,
    ): Promise<NotificationAnalytics | null> {
        if (!this.isOneSignalConfigured()) return null;

        try {
            const url = `${this.oneSignalApiUrl}/${notificationId}?app_id=${this.oneSignalAppId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getOneSignalHeaders(),
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`OneSignal get notification error: ${error}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to get notification analytics', error);
            return null;
        }
    }

    /**
     * Get list of notifications with analytics
     */
    async getNotificationsAnalytics(
        options: {
            limit?: number;
            offset?: number;
            kind?: 0 | 1 | 3; // 0=Dashboard, 1=API, 3=Automated
        } = {},
    ): Promise<NotificationListResponse | null> {
        if (!this.isOneSignalConfigured()) return null;

        const { limit = 50, offset = 0, kind } = options;

        try {
            let url = `${this.oneSignalApiUrl}?app_id=${this.oneSignalAppId}&limit=${limit}&offset=${offset}`;

            if (kind !== undefined) {
                url += `&kind=${kind}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getOneSignalHeaders(),
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`OneSignal list notifications error: ${error}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to get notifications list', error);
            return null;
        }
    }

    /**
     * Analytics Summary - Aggregated stats for last N days
     */
    async getAnalyticsSummary(days: number = 7): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalClicked: number;
        totalFailed: number;
        clickRate: number;
        deliveryRate: number;
        notifications: NotificationAnalytics[];
    } | null> {
        const result = await this.getNotificationsAnalytics({ limit: 50 });

        if (!result) return null;

        const cutoffTime = Date.now() / 1000 - days * 24 * 60 * 60;

        // Filter recent notifications
        const recentNotifications = result.notifications.filter(
            (n) => n.queued_at > cutoffTime,
        );

        const summary = recentNotifications.reduce(
            (acc, n) => ({
                totalSent: acc.totalSent + n.successful + n.failed + n.errored, // Total attempted
                totalDelivered: acc.totalDelivered + n.successful, // Successfully delivered to push service
                totalClicked: acc.totalClicked + n.converted,
                totalFailed: acc.totalFailed + n.failed + n.errored,
            }),
            { totalSent: 0, totalDelivered: 0, totalClicked: 0, totalFailed: 0 },
        );

        return {
            ...summary,
            clickRate:
                summary.totalSent > 0
                    ? Number(((summary.totalClicked / summary.totalSent) * 100).toFixed(2))
                    : 0,
            deliveryRate:
                summary.totalSent > 0
                    ? Number(
                        ((summary.totalDelivered / summary.totalSent) * 100).toFixed(2),
                    )
                    : 0,
            notifications: recentNotifications,
        };
    }

    /**
     * Platform-based analytics
     */
    async getPlatformAnalytics(notificationId: string): Promise<{
        ios: PlatformStats | null;
        android: PlatformStats | null;
        web: PlatformStats | null;
    } | null> {
        const notification = await this.getNotificationAnalytics(notificationId);

        if (!notification?.platform_delivery_stats) return null;

        return {
            ios: notification.platform_delivery_stats.ios || null,
            android: notification.platform_delivery_stats.android || null,
            web: notification.platform_delivery_stats.web || null,
        };
    }
}
