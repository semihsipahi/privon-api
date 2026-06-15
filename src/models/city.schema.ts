import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class City extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  state?: string;

  @Prop({ default: false })
  isCapital: boolean;

  @Prop({ default: false })
  isDestination: boolean;

  @Prop()
  countryCode?: string;
}

export const CitySchema = SchemaFactory.createForClass(City);
CitySchema.index({ name: 1, country: 1 }, { unique: true });
