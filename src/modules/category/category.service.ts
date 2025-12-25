import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RestaurantCategory } from '../../models/restaurant-category.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateCategoryDto } from 'src/dtos/create-category.dto';
import { UpdateCategoryDto } from 'src/dtos/update-category.dto';

@Injectable()
export class CategoryService extends ResourceService<
    RestaurantCategory,
    CreateCategoryDto,
    UpdateCategoryDto
> {
    constructor(
        @InjectModel(RestaurantCategory.name)
        private categoryModel: Model<RestaurantCategory>,
        @InjectModel(Restaurant.name)
        private restaurantModel: Model<Restaurant>,
    ) {
        super(categoryModel);
    }

    async deleteCategory(id: string) {
        const category = await this.categoryModel.findById(id);
        if (!category) {
            throw new NotFoundException('Kategori bulunamadı');
        }

        // 1. Delete the category
        await this.categoryModel.findByIdAndDelete(id);

        // 2. Unlink from restaurants
        await this.restaurantModel.updateMany(
            { category: id },
            { $unset: { category: '' } },
        );

        return { message: 'Kategori silindi ve ilgili restoranlar güncellendi.' };
    }
}
