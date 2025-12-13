import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReservationStatus } from 'src/common/enums/discount.enum';


@Schema({ timestamps: true })
export class SlotReservation extends Document {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'DiscountSchedule',
        required: true,
    })
    schedule: MongooseSchema.Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
        required: true,
    })
    user: MongooseSchema.Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    })
    restaurant: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    reservationDate: Date;

    @Prop({ required: true })
    slotStartTime: string;

    @Prop({ required: true })
    slotEndTime: string;

    @Prop({ required: true })
    guestCount: number;

    @Prop({ required: true, unique: true })
    reservationCode: string;

    @Prop({
        type: String,
        enum: ReservationStatus,
        default: ReservationStatus.CLAIMED,
    })
    status: ReservationStatus;

    @Prop()
    discountPercentage?: number;

    @Prop()
    orderAmount?: number;

    @Prop()
    discountAmount?: number;

    @Prop()
    finalAmount?: number;

    @Prop()
    validatedAt?: Date;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const SlotReservationSchema =
    SchemaFactory.createForClass(SlotReservation);

SlotReservationSchema.index(
    {
        schedule: 1,
        reservationDate: 1,
        slotStartTime: 1,
    },
    {
        unique: false,
    },
);

SlotReservationSchema.index({ reservationCode: 1 }, { unique: true });
SlotReservationSchema.index({ user: 1, status: 1 });
SlotReservationSchema.index({ restaurant: 1, reservationDate: 1 });
