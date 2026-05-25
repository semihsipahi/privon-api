import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, isValidObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { User } from '../../models/user.schema';
import { Reservation } from '../../models/reservation.schema';
import { RevenueCatWebhookDto } from './dtos/revenue-cat-webhook.dto';
import { Role } from 'src/common/enums/role.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { UserService } from '../user/user.service';

// Rezervem eventType → ReservationStatus (null = özel işlem gerekir)
const REZERVEM_EVENT_STATUS: Record<number, ReservationStatus | null> = {
    1:  ReservationStatus.CONFIRMED,   // ReservationCreated
    2:  null,                           // ReservationUpdated (tarih/saat değişebilir)
    3:  ReservationStatus.CANCELLED,   // ReservationCancelled
    4:  ReservationStatus.SEATED,      // ReservationCheckedIn
    5:  ReservationStatus.COMPLETED,   // ReservationCheckedOut
    14: ReservationStatus.CONFIRMED,   // ReservationConfirmed (request mode)
};

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
        private userService: UserService,
        private readonly configService: ConfigService,
    ) { }

    async handleRevenueCatWebhook(payload: RevenueCatWebhookDto) {
        const isBetaMode = this.configService.get<string>('BETA_MODE') === 'true';

        if (isBetaMode) {
            this.logger.log('Beta modu aktif - webhook işlenmedi');
            return { message: 'Beta modu - webhook atlandı' };
        }

        const { event } = payload;
        const userId = event.app_user_id;
        this.logger.log(`Received RevenueCat webhook event: ${event.type} for user: ${userId}`);

        const user = await this.userModel.findById(userId);

        if (!user) {
            this.logger.error(`User not found for identifiers: ${JSON.stringify(userId)}`);
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

    // ─── Rezervem Webhook Handler ──────────────────────────────────────────────

    async handleRezervemWebhook(params: {
        payload: any;
        rawBody: Buffer;
        signature?: string;
        eventId?: string;
        timestamp?: string;
    }): Promise<{ ok: boolean; message?: string }> {
        const { payload, rawBody, signature, eventId, timestamp } = params;

        // 1. HMAC doğrulama (REZERVEM_WEBHOOK_SECRET tanımlıysa zorunlu)
        const secret = this.configService.get<string>('REZERVEM_WEBHOOK_SECRET');
        if (secret) {
            if (!signature || !timestamp) {
                this.logger.warn('[RezervemWebhook] İmza veya timestamp eksik — red');
                return { ok: false, message: 'Missing signature' };
            }
            const expected = this.computeWebhookSignature(rawBody, timestamp, secret);
            if (signature !== expected) {
                this.logger.warn(`[RezervemWebhook] İmza uyuşmazlığı eventId=${eventId}`);
                return { ok: false, message: 'Invalid signature' };
            }
        }

        // 2. Idempotency — aynı eventId iki kez işlenmesin
        if (eventId) {
            const already = await this.reservationModel.findOne(
                { _webhookEventIds: eventId } as any
            ).lean();
            if (already) {
                this.logger.log(`[RezervemWebhook] Duplicate event ignored: ${eventId}`);
                return { ok: true, message: 'duplicate' };
            }
        }

        const eventTypeNum: number = typeof payload.eventType === 'number'
            ? payload.eventType
            : this.eventTypeFromString(payload.eventType);
        const data = payload.data ?? {};
        const rezervemId = data.reservationId != null ? String(data.reservationId) : null;

        this.logger.log(
            `[RezervemWebhook] eventType=${eventTypeNum}(${payload.eventType}) eventId=${eventId ?? '-'} rezervemId=${rezervemId ?? '-'} venueSlug=${data.venueSlug ?? '-'}`,
        );

        if (!rezervemId) {
            this.logger.warn('[RezervemWebhook] reservationId eksik — atlandı');
            return { ok: true, message: 'no reservationId' };
        }

        const newStatus = REZERVEM_EVENT_STATUS[eventTypeNum];

        // eventType=2 (Updated): tarih/saat/pax güncelle
        if (eventTypeNum === 2) {
            const updateFields: any = {};
            if (data.date) updateFields.date = data.date;
            if (data.time) updateFields.time = data.time;
            if (data.pax) updateFields.personCount = data.pax;
            if (eventId) updateFields['$addToSet'] = { _webhookEventIds: eventId };
            if (Object.keys(updateFields).length > 0) {
                const result = await this.reservationModel.findOneAndUpdate(
                    { rezervemId },
                    { $set: { date: updateFields.date, time: updateFields.time, personCount: updateFields.personCount }, ...(eventId ? { $addToSet: { _webhookEventIds: eventId } } : {}) },
                    { new: true },
                );
                this.logger.log(`[RezervemWebhook] Updated rezervemId=${rezervemId} → date=${data.date} time=${data.time}`);
            }
            return { ok: true };
        }

        if (newStatus === null) {
            this.logger.log(`[RezervemWebhook] eventType=${eventTypeNum} — no status change needed`);
            return { ok: true, message: 'no-op event' };
        }

        // Status güncelleme — geriye dönük (CANCELLED → CONFIRMED gibi) geçişleri engelle
        const FINAL_STATUSES = [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW];
        const existing = await this.reservationModel.findOne({ rezervemId }).lean();

        if (!existing) {
            this.logger.warn(`[RezervemWebhook] Rezervasyon bulunamadı rezervemId=${rezervemId}`);
            return { ok: true, message: 'reservation not found in DB' };
        }

        if (FINAL_STATUSES.includes(existing.status as ReservationStatus) && !FINAL_STATUSES.includes(newStatus)) {
            this.logger.warn(`[RezervemWebhook] Son durum korunuyor: ${existing.status} → ${newStatus} atlandı (rezervemId=${rezervemId})`);
            return { ok: true, message: 'final status protected' };
        }

        const updateQuery: any = { $set: { status: newStatus } };
        if (eventId) updateQuery.$addToSet = { _webhookEventIds: eventId };

        await this.reservationModel.findOneAndUpdate({ rezervemId }, updateQuery);
        this.logger.log(`[RezervemWebhook] ✅ rezervemId=${rezervemId} ${existing.status} → ${newStatus} (eventType=${eventTypeNum})`);

        return { ok: true };
    }

    private computeWebhookSignature(rawBody: Buffer, timestamp: string, secret: string): string {
        const data = `${timestamp}.${rawBody.toString('utf8')}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(data);
        return `sha256=${hmac.digest('hex')}`;
    }

    private eventTypeFromString(type: string): number {
        const map: Record<string, number> = {
            ReservationCreated: 1,
            ReservationUpdated: 2,
            ReservationCancelled: 3,
            ReservationCheckedIn: 4,
            ReservationCheckedOut: 5,
            ReservationTableUpdated: 6,
            ProvisionPaymentReceived: 7,
            ProvisionPaymentCanceled: 8,
            PrePaymentReceived: 9,
            PrePaymentCanceled: 10,
            PartnerIntegrationToggled: 13,
            ReservationConfirmed: 14,
        };
        return map[type] ?? -1;
    }
}
