import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DayOfWeek } from '../common/enums/discount.enum';

@Schema({ _id: false })
export class DiscountSlot {
    @Prop({ required: true })
    startTime: string;

    @Prop({ required: true })
    endTime: string;

    @Prop({ required: true })
    availableTables: number;

    @Prop({ required: true, default: 1 })
    minGuests: number;

    @Prop({ required: true, default: 4 })
    maxGuests: number;

    @Prop({ required: true })
    discountPercentage: number;
}

export const DiscountSlotSchema = SchemaFactory.createForClass(DiscountSlot);

@Schema({ _id: false })
export class DateRange {
    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ default: false })
    isUnlimited: boolean;
}

@Schema({ timestamps: true })
export class DiscountSchedule extends Document {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    })
    restaurant: MongooseSchema.Types.ObjectId;

    @Prop({ type: [String], enum: DayOfWeek, required: true })
    activeDays: DayOfWeek[];

    @Prop({ required: true })
    startTime: string;

    @Prop({ required: true })
    endTime: string;

    @Prop({ required: true, default: 30 })
    slotDurationMinutes: number;

    @Prop({ type: [DiscountSlotSchema] })
    slots: DiscountSlot[];

    @Prop({ required: true, default: 1 })
    minGuests: number;

    @Prop({ required: true, default: 6 })
    maxGuests: number;

    @Prop({ required: true })
    tablesPerSlot: number;

    @Prop({ required: true })
    discountPercentage: number;

    @Prop({ type: DateRange })
    dateRange?: DateRange;

    @Prop({ default: true })
    isActive: boolean;
}

export const DiscountScheduleSchema =
    SchemaFactory.createForClass(DiscountSchedule);
