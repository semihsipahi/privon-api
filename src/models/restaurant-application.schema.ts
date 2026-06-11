import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantApplicationDocument = RestaurantApplication & Document;

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class RestaurantApplication extends Document {
  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  ownerFirstName: string;

  @Prop({ required: true })
  ownerLastName: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({
    required: true,
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;
}

export const RestaurantApplicationSchema = SchemaFactory.createForClass(
  RestaurantApplication,
);
