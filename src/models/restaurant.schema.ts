import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [longitude, latitude] - GeoJSON format

  @Prop()
  address: string;
}

@Schema({ _id: false })
export class WorkingHours {
  @Prop()
  dayName: string;

  @Prop()
  openingTime: string;

  @Prop()
  closingTime: string;

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

  @Prop({ type: Location })
  location: Location;

  @Prop()
  website?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  menu?: string;

  @Prop()
  campaignTerms?: string;

  @Prop({ type: [WorkingHours], default: [] })
  workingHours: WorkingHours[];
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ 'location.coordinates': '2dsphere' });
