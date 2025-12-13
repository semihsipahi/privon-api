import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RestaurantType } from '../../models/restaurant-type.schema';
import { CreateRestaurantTypeDto } from 'src/dtos/create-restaurant-type.dto';
import { UpdateRestaurantTypeDto } from 'src/dtos/update-restaurant-type.dto';
import { ResourceService } from 'src/services/resource.service';
import { CustomException } from 'src/common/exceptions/custom.exception';

@Injectable()
export class RestaurantTypeService extends ResourceService<
  RestaurantType,
  CreateRestaurantTypeDto,
  UpdateRestaurantTypeDto
> {
  constructor(
    @InjectModel(RestaurantType.name)
    private restaurantTypeModel: Model<RestaurantType>,
  ) {
    super(restaurantTypeModel);
  }

  /**
   * "Genel" default kategorisini bulur veya oluşturur
   */
  async findOrCreateDefault(): Promise<RestaurantType> {
    let defaultType = await this.restaurantTypeModel
      .findOne({ isDefault: true })
      .exec();

    if (!defaultType) {
      defaultType = await this.restaurantTypeModel.create({
        name: 'Genel',
        isDefault: true,
      });
    }

    return defaultType;
  }

  /**
   * Restoran türünü siler
   * Eğer default kategori ise silmeye izin vermez
   * Eğer bu türe ait restoranlar varsa, onları "Genel" kategorisine taşır
   */
  async deleteRestaurantType(id: string): Promise<RestaurantType> {
    const restaurantType = await this.findByID(id);

    if (!restaurantType) {
      throw new CustomException('Restoran türü bulunamadı', 404);
    }

    // Default kategori silinemez
    if (restaurantType.isDefault) {
      throw new CustomException('Varsayılan kategori silinemez', 400);
    }

    // Default kategoriye sahip olduğumuzdan emin ol
    await this.findOrCreateDefault();

    // TODO: Restoran şeması eklendiğinde bu kısmı aktif et
    // Bu türe ait restoranları "Genel" kategorisine taşı
    // const defaultType = await this.findOrCreateDefault();
    // await this.restaurantModel.updateMany(
    //   { restaurantType: id },
    //   { restaurantType: defaultType._id }
    // );

    // Kategoriyi sil
    return await this.delete(id);
  }
}
