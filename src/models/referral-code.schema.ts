import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ReferralCodeType } from 'src/common/enums/referral-code-type.enum';
import { ReferralCodeStatus } from 'src/common/enums/referral-code-status.enum';

@Schema({ timestamps: true })
export class ReferralCode extends Document {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, enum: ReferralCodeType })
  type: ReferralCodeType;

  @Prop({ required: true, enum: ReferralCodeStatus, default: ReferralCodeStatus.Active })
  status: ReferralCodeStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Restaurant' })
  assignedTo: MongooseSchema.Types.ObjectId;

  @Prop()
  description: string;

  @Prop({ required: true, default: 1 })
  quota: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  usedBy: MongooseSchema.Types.ObjectId[];
}

export const ReferralCodeSchema = SchemaFactory.createForClass(ReferralCode);

ReferralCodeSchema.index({ type: 1, status: 1 });
ReferralCodeSchema.index({ createdBy: 1 });
