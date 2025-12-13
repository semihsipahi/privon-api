import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  })
  restaurant: MongooseSchema.Types.ObjectId;

  @Prop({ max: 5 })
  rating: number;

  @Prop({ trim: true })
  comment: string;

  @Prop({ type: String, trim: true, default: null })
  restaurantReply: string;

  @Prop({ type: Date, default: null })
  repliedAt: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'SlotReservation',
    required: true,
  })
  slotReservation: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Index to ensure one review per reservation
ReviewSchema.index({ slotReservation: 1 }, { unique: true });

// Index for efficient restaurant queries
ReviewSchema.index({ restaurant: 1, isActive: 1 });

// Index for user queries
ReviewSchema.index({ user: 1, isActive: 1 });
