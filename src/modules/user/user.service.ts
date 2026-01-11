import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../../models/user.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from 'src/dtos';
import { ResourceService } from 'src/services/resource.service';
import { maskName } from 'src/helpers/mask-name.util';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class UserService extends ResourceService<
  User,
  CreateUserDto,
  CreateUserDto
> {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
  ) {
    super(userModel);
  }

  async create(data: CreateUserDto, session?: any) {
    const maskedName = maskName(data.fullName);
    const userData = {
      ...data,
      maskedName,
    };
    return super.create(userData as any, session);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -verificationCode -codeExpiresAt')
      .lean();

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    const response: any = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      imageUrl: user.imageUrl,
      isPhoneVerified: user.isPhoneVerified,
    };

    // Restoran sahibi ise restoran bilgisini ekle
    if (user.role === Role.RestaurantOwner) {
      const restaurant = await this.restaurantModel
        .findOne({ owner: user._id })
        .select('_id name images')
        .lean();

      if (restaurant) {
        response.restaurant = {
          id: restaurant._id,
          name: restaurant.name,
          imageUrl: restaurant.images?.[0],
        };
      }
    }

    return response;
  }

  async addFavoriteRestaurant(userId: string, restaurantId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteRestaurants: restaurantId } },
      { new: true },
    );
  }

  async removeFavoriteRestaurant(userId: string, restaurantId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { favoriteRestaurants: restaurantId } },
      { new: true },
    );
  }

  async getFavoriteRestaurants(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'favoriteRestaurants',
        select: '_id name images categories rating reviewCount',
        populate: {
          path: 'categories',
          select: 'name',
        },
      })
      .lean();

    if (!user || !user.favoriteRestaurants) {
      return [];
    }

    return (user.favoriteRestaurants as any[]).map((restaurant) => ({
      ...restaurant,
      categories: restaurant.categories?.map((c: any) => c.name) || [],
    }));
  }

  async updateProfile(
    userId: string,
    data: { fullName?: string; imageUrl?: string },
  ) {
    const updateData: any = {};

    if (data.fullName) {
      updateData.fullName = data.fullName;
      updateData.maskedName = maskName(data.fullName);
    }

    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -verificationCode -codeExpiresAt')
      .lean();

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      imageUrl: user.imageUrl,
      isPhoneVerified: user.isPhoneVerified,
    };
  }
}
