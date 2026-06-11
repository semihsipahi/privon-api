import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum LegalDocType {
  TermsOfUse = 'terms_of_use',
  PrivacyPolicy = 'privacy_policy',
  ExplicitConsent = 'explicit_consent',
  CookiePolicy = 'cookie_policy',
  CommercialConsent = 'commercial_consent',
}

@Schema({ timestamps: true })
export class LegalDocument extends Document {
  @Prop({ required: true, enum: LegalDocType })
  type: LegalDocType;

  @Prop({ required: true })
  version: number;

  @Prop({
    required: true,
    type: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    _id: false,
  })
  title: { tr: string; en: string; fr: string };

  @Prop({
    required: true,
    type: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    _id: false,
  })
  content: { tr: string; en: string; fr: string };

  @Prop({
    required: true,
    type: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    _id: false,
  })
  summary: { tr: string; en: string; fr: string };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  effectiveDate: Date;
}

export const LegalDocumentSchema = SchemaFactory.createForClass(LegalDocument);

LegalDocumentSchema.index({ type: 1, version: 1 }, { unique: true });
LegalDocumentSchema.index({ type: 1, isActive: 1 });
