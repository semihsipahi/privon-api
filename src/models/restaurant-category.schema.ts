import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class RestaurantCategory extends Document {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop()
    description: string;

    @Prop()
    descriptionEn: string;

    @Prop()
    visibleOnHomePage: boolean;

    @Prop()
    order: number;
}

export const RestaurantCategorySchema =
    SchemaFactory.createForClass(RestaurantCategory);
