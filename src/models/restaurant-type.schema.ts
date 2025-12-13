import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class RestaurantType extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const RestaurantTypeSchema = SchemaFactory.createForClass(RestaurantType);
