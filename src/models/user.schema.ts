import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Role } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  fullName: string;

  @Prop()
  maskedName: string;

  @Prop({ unique: true, sparse: true })
  email: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  password: string;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop()
  verificationCode: string;

  @Prop()
  codeExpiresAt: Date;

  @Prop({ required: true, enum: Role })
  role: Role;

  @Prop()
  subscriptionExpiresAt: Date;

  @Prop({ type: [Date], default: [] })
  noShowDates: Date[];

  @Prop()
  reservationBanExpiresAt: Date;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.Active })
  status: UserStatus;

  @Prop()
  ipAddress: string;

  @Prop({ type: [{ type: Object }], default: [] })
  transactions: Record<string, any>[];

  @Prop({
    type: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      campaign: { type: Boolean, default: true },
      promotion: { type: Boolean, default: true },
    },
    default: { email: true, sms: true, campaign: true, promotion: true },
    _id: false,
  })
  notification: {
    email: boolean;
    sms: boolean;
    campaign: boolean;
    promotion: boolean;
  };

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Restaurant' }],
    default: [],
  })
  favoriteRestaurants: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ReferralCode' })
  registeredWithCode: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  referredBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: 0 })
  completedReservationCount: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
