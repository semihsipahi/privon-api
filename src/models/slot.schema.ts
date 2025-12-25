import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Slot extends Document {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    })
    restaurant: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    time: string;

    @Prop({ min: 1 })
    minPersons: number;

    @Prop({ min: 1 })
    maxPersons: number;

    @Prop({ min: 1 })
    tableQuota: number;

    @Prop()
    discount: number;

    @Prop({ type: [Number], required: true })
    days: number[];
}

export const SlotSchema = SchemaFactory.createForClass(Slot);

SlotSchema.index({ restaurant: 1 });
