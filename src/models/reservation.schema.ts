import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

@Schema({ timestamps: true })
export class Reservation extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Slot', required: true })
    slot: MongooseSchema.Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    })
    restaurant: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    customer: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    date: string; // "YYYY-MM-DD"

    @Prop({ required: true, min: 1 })
    personCount: number;

    @Prop({
        enum: ReservationStatus,
        default: ReservationStatus.PENDING,
    })
    status: string;

    @Prop()
    totalAmount?: number; // Toplam tutar (indirimsiz)

    @Prop({ default: 0 })
    nonDiscountedAmount?: number; // İndirime dahil olmayan tutar

    @Prop()
    finalAmount?: number; // Müşterinin ödediği son tutar (indirimli)

    @Prop()
    savedAmount?: number; // Kazanç (indirim tutarı)
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

ReservationSchema.index({ restaurant: 1, date: 1 });
ReservationSchema.index({ slot: 1, date: 1, status: 1 });
ReservationSchema.index({ customer: 1 });
