import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Banner extends Document {
    @Prop({ required: true })
    image: string;

    @Prop({ required: true, default: 0 })
    order: number;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
