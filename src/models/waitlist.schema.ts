import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Waitlist extends Document {
    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, unique: true })
    phoneNumber: string;

    @Prop()
    city?: string;

    @Prop()
    birthDate?: string;

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

    @Prop({
        enum: ['pending', 'suitable', 'approved', 'rejected'],
        default: 'pending',
    })
    status: 'pending' | 'suitable' | 'approved' | 'rejected';

    @Prop()
    statusNote?: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
