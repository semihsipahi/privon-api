import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class TastingMenuCourse {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;
}

export const TastingMenuCourseSchema = SchemaFactory.createForClass(TastingMenuCourse);

@Schema({ timestamps: true })
export class TastingMenu extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  titleEn?: string;

  @Prop()
  description?: string;

  @Prop()
  descriptionEn?: string;

  @Prop()
  duration?: string;

  @Prop()
  pricePerPerson?: number;

  @Prop()
  image?: string;

  @Prop({ type: [TastingMenuCourseSchema], default: [] })
  courses: TastingMenuCourse[];

  @Prop({ default: true })
  isActive: boolean;
}

export const TastingMenuSchema = SchemaFactory.createForClass(TastingMenu);
