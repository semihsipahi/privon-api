import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class SupportRequest extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  email?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  user?: MongooseSchema.Types.ObjectId;

  @Prop()
  status: string;
}

export const SupportRequestSchema =
  SchemaFactory.createForClass(SupportRequest);
