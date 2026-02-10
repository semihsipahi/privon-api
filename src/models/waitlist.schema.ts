import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Waitlist extends Document {
    @Prop({ required: true })
    fullName: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    phoneNumber: string;

    @Prop()
    referralMember?: string;

    @Prop()
    gastronomyReference?: string;

    @Prop({ required: true })
    city: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
