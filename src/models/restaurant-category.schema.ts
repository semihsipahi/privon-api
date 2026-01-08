import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class RestaurantCategory extends Document {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop()
    image: string;

    @Prop()
    color: string;

    @Prop()
    visibleOnHomePage: boolean;
}

export const RestaurantCategorySchema =
    SchemaFactory.createForClass(RestaurantCategory);
