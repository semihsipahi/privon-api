import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PendingPayment } from '../../models/pending-payment.schema';

@Injectable()
export class PendingPaymentService {
  private readonly logger = new Logger(PendingPaymentService.name);

  constructor(
    @InjectModel(PendingPayment.name)
    private readonly model: Model<PendingPayment>,
  ) {}

  async create(data: {
    sessionId: string;
    slug: string;
    userId?: string;
    guestInfo: any;
    bookingMeta?: any;
    status?: string;
    expiresAt?: Date;
  }): Promise<PendingPayment> {
    return this.model.create({
      sessionId: data.sessionId,
      slug: data.slug,
      userId: data.userId,
      guestInfo: data.guestInfo,
      bookingMeta: data.bookingMeta,
      status: data.status ?? 'pending',
      expiresAt: data.expiresAt ?? new Date(Date.now() + 900_000),
    });
  }

  async findBySessionId(sessionId: string): Promise<PendingPayment | null> {
    return this.model.findOne({ sessionId }).exec();
  }

  async updateStatus(
    sessionId: string,
    status: 'paid' | 'finalized' | 'failed' | 'expired',
    extra?: { transactionId?: string; errorMessage?: string },
  ): Promise<void> {
    const update: any = { status };
    if (status === 'finalized') update.finalizedAt = new Date();
    if (extra?.transactionId) update.transactionId = extra.transactionId;
    if (extra?.errorMessage) update.errorMessage = extra.errorMessage;
    await this.model.updateOne({ sessionId }, update).exec();
  }

  async expireOldPending(): Promise<number> {
    const result = await this.model
      .updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { status: 'expired' },
      )
      .exec();
    return result.modifiedCount;
  }
}
