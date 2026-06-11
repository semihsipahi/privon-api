import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'pending_payments' })
export class PendingPayment extends Document {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Object, required: true })
  guestInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    note?: string;
    femaleCount?: number;
    needInvoice?: boolean;
    company?: {
      title?: string;
      address?: string;
      taxOffice?: string;
      taxNumber?: string;
    };
  };

  @Prop({ type: Object })
  bookingMeta?: {
    pax: number;
    date: string;
    time: string;
    areaName?: string;
  };

  @Prop({ default: 'pending' })
  status: 'pending' | 'paid' | 'finalized' | 'failed' | 'expired';

  @Prop()
  expiresAt?: Date;

  @Prop()
  finalizedAt?: Date;

  @Prop()
  transactionId?: string;

  @Prop()
  errorMessage?: string;
}

export const PendingPaymentSchema =
  SchemaFactory.createForClass(PendingPayment);
