import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'rezervem_venues' })
export class RezervemVenue extends Document {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  displayName: string;

  @Prop()
  logoUrl: string;

  @Prop()
  coverPhoto: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop()
  address: string;

  @Prop()
  contact: string;

  @Prop()
  timezone: string;

  @Prop()
  currency: string;

  @Prop({ type: [String], default: [] })
  supportedLanguages: string[];

  // Rezervem booking metadata
  @Prop({ type: Object })
  pax: { min: number; max: number; step: number };

  // Payment capabilities — used to determine paymentMode for hold requests.
  // mayRequire.preauth === true → venue is Pre-Authorization, hold must use paymentMode:"deferred"
  @Prop({ type: Object })
  paymentPreview: any;

  @Prop({ type: Object })
  tastingMenu: any;

  @Prop({ type: Object })
  bookingFlow: any;

  @Prop({ type: Object })
  uiHints: any;

  @Prop({ type: Object })
  policies: any;

  @Prop({ type: Object })
  leadTimes: any;

  @Prop({ type: Object })
  genderPolicy: any;

  @Prop({ type: Object })
  groupBooking: any;

  @Prop({ type: [Object], default: [] })
  areas: Array<{
    id: number;
    title: string;
    summary?: string;
    minCapacity: number;
    maxCapacity: number;
    shifts: number[];
    photos: string[];
    coverPhoto?: string;
    hasTastingMenu: boolean;
  }>;

  @Prop({ type: [Object], default: [] })
  tags: Array<{ id: number; title: string; summary?: string }>;

  @Prop({ type: [Object], default: [] })
  workingHours: Array<{
    dayName: string;
    periods: Array<{ openingTime: string; closingTime: string }>;
    isClosed: boolean;
  }>;

  // Bizim taraf — kategori eşleme
  @Prop({ index: true })
  categoryKey: string; // e.g. "Michelin Guide" — matches RestaurantCategory.name

  @Prop({ default: 100 })
  categoryScore: number; // strength of the match (override=1000, heuristic up to 300)

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  adminExcluded: boolean;

  @Prop({ type: [String], default: [] })
  badges: string[]; // e.g. ['Michelin', 'Tasting Menu', 'New']

  @Prop({ type: [String], default: [] })
  cuisineTypes: string[];

  @Prop()
  hasTastingMenu: boolean;

  @Prop()
  lastSyncedAt: Date;

  @Prop()
  lastSyncError: string;
}

export const RezervemVenueSchema = SchemaFactory.createForClass(RezervemVenue);
