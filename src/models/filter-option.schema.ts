import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FilterOptionType = 'cuisine' | 'atmosphere';

@Schema({ timestamps: true })
export class FilterOption extends Document {
  @Prop({ required: true, enum: ['cuisine', 'atmosphere'] })
  type: FilterOptionType;

  @Prop({ required: true })
  value: string; // API filtre anahtarı: 'italian', 'romantic' vb.

  @Prop({ required: true })
  label: string; // Ekranda gösterilecek: 'İtalyan', 'Romantik' vb.

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const FilterOptionSchema = SchemaFactory.createForClass(FilterOption);

FilterOptionSchema.index({ type: 1, isActive: 1, order: 1 });
