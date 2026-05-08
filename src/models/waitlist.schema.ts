import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Waitlist extends Document {
    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    phoneNumber: string;

    @Prop({ required: true })
    city: string;

    @Prop()
    hospitalityStandards?: string;

    @Prop()
    privateClubMemberships?: string;

    @Prop()
    frequentCities?: string;

    @Prop()
    hospitalityValues?: string;

    @Prop()
    introducedBy?: string;

    @Prop({ required: true })
    agreedToTerms: boolean;

    @Prop({ required: true })
    agreedToPrivacy: boolean;

    @Prop({ default: false })
    consentToCommunications?: boolean;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
