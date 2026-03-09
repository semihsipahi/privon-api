import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Reservation } from './reservation.schema';

export enum DelayedNotificationJobStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum DelayedNotificationJobType {
    NEW_RESERVATION = 'NEW_RESERVATION',
    USER_REMINDER_24H = 'USER_REMINDER_24H',
    USER_REMINDER_4H = 'USER_REMINDER_4H',
}

@Schema({ timestamps: true })
export class DelayedNotificationJob extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Reservation', required: true })
    reservation: Reservation | MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    executeAt: Date;

    @Prop({ required: true, enum: DelayedNotificationJobType })
    type: DelayedNotificationJobType;

    @Prop({
        required: true,
        enum: DelayedNotificationJobStatus,
        default: DelayedNotificationJobStatus.PENDING,
    })
    status: DelayedNotificationJobStatus;
}

export const DelayedNotificationJobSchema = SchemaFactory.createForClass(
    DelayedNotificationJob,
);

// Indexler ile cron sorgusunu hızlandır
DelayedNotificationJobSchema.index({ status: 1, executeAt: 1 });
