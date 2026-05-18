import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CuisineType } from '../common/enums/cuisine-type.enum';
import { AtmosphereType } from '../common/enums/atmosphere-type.enum';

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number] })
  coordinates: number[]; // [longitude, latitude] - GeoJSON format

  @Prop()
  address: string;

  @Prop()
  city?: string; // il

  @Prop()
  district?: string; // ilçe

}

@Schema({ _id: false })
export class WorkingPeriod {
  @Prop()
  openingTime: string;

  @Prop()
  closingTime: string;
}

@Schema({ _id: false })
export class WorkingHours {
  @Prop()
  dayName: string;

  @Prop({ type: [WorkingPeriod], default: [] })
  periods: WorkingPeriod[];

  @Prop({ default: false })
  isClosed: boolean;
}

@Schema({ timestamps: true })
export class Restaurant extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  owner: MongooseSchema.Types.ObjectId;

  @Prop()
  name: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'RestaurantCategory' }],
    default: [],
  })
  categories: MongooseSchema.Types.ObjectId[];

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop()
  priceLevel: number;

  @Prop({ type: Location })
  location: Location;

  @Prop()
  description?: string;

  @Prop()
  descriptionEng?: string;

  @Prop()
  website?: string;

  @Prop()
  instagramUrl?: string;

  @Prop()
  facebookUrl?: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  menu?: string;

  @Prop()
  campaignTerms?: string;

  @Prop({ type: [WorkingHours], default: [] })
  workingHours: WorkingHours[];

  @Prop({ type: [String], default: [] })
  awards: string[];

  @Prop({ type: [String], default: [] })
  cuisineTypes: string[];

  @Prop({ type: [String], default: [] })
  atmosphereTypes: string[];

  @Prop({ sparse: true })
  rezervemSlug?: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ 'location.coordinates': '2dsphere' });
