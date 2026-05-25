import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'whitelist' })
export class Whitelist extends Document {
  @Prop({ required: true, unique: true, trim: true })
  phoneNumber: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ trim: true })
  addedBy?: string;
}

export const WhitelistSchema = SchemaFactory.createForClass(Whitelist);
