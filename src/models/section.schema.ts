import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Restaurant } from './restaurant.schema';

@Schema({ timestamps: true })
export class Section extends Document {
    @Prop({ required: true })
    title: string;

    @Prop({ default: 'home' })
    type: string;

    @Prop({ default: 0 })
    order: number;

    @Prop({
        type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Restaurant' }],
        default: [],
    })
    restaurants: MongooseSchema.Types.ObjectId[] | Restaurant[];
}

export const SectionSchema = SchemaFactory.createForClass(Section);
