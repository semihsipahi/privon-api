import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true, enum: ['global', 'personal'] })
  type: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  targetUserId?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop()
  userCount?: number;

  @Prop()
  oneSignalId?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
