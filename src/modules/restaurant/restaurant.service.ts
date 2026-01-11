import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../../models/restaurant.schema';
import { User } from '../../models/user.schema';
import { CreateRestaurantDto } from 'src/dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dtos/update-restaurant.dto';
import { ResourceService } from 'src/services/resource.service';
import { calculateDistance } from 'src/utils/distance-calculation.util';

export interface PublicRestaurantDetailsResponse {
  restaurant: any;
  distance: number | null;
  isFavorite: boolean;
}

export interface PublicRestaurantsListResponse {
  data: any[];
  total: number;
}

@Injectable()
export class RestaurantService extends ResourceService<
  Restaurant,
  CreateRestaurantDto,
  UpdateRestaurantDto
> {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<Restaurant>,
    @InjectModel('User')
    private userModel: Model<User>,
  ) {
    super(restaurantModel);
  }

  async getPublicRestaurantDetails(
    id: string,
    userLat?: number,
    userLon?: number,
    userId?: string,
  ) {
    const restaurant = await this.restaurantModel
      .findById(id)
      .populate('categories', 'name')
      .populate('owner', 'name email')
      .lean();

    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı');
    }

    let distance: number | null = null;
    if (
      userLat !== undefined &&
      userLon !== undefined &&
      (restaurant as any).location?.coordinates
    ) {
      const [restLon, restLat] = (restaurant as any).location.coordinates;
      distance = calculateDistance(userLat, userLon, restLat, restLon);
    }

    let isFavorite = false;
    if (userId) {
      const exists = await this.userModel.exists({
        _id: userId,
        favoriteRestaurants: id,
      });
      isFavorite = !!exists;
    }

    return {
      restaurant: {
        ...restaurant,
        distance,
        isFavorite,
      }
    };
  }

  async getPublicRestaurantsList(filters: {
    q?: string;
    categories?: string;
    discount?: number;
    userLat?: number;
    userLon?: number;
    maxDistance?: number;
    sortBy?: 'distance' | 'rating';
    _start?: number;
    _end?: number;
    date?: string;
  }): Promise<PublicRestaurantsListResponse> {
    const {
      q,
      categories,
      discount,
      userLat,
      userLon,
      maxDistance,
      sortBy = 'distance',
      _start = 0,
      _end = 10,
      date,
    } = filters;
    const start = Number(_start);
    const end = Number(_end);
    const limit = end - start;

    // Tarih yoksa UTC+3'e göre bugünü hesapla
    let effectiveDate = date;
    if (!effectiveDate) {
      const now = new Date();
      // UTC+3 için 3 saat ekle
      const utcPlus3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      effectiveDate = utcPlus3.toISOString().split('T')[0];
    }

    // Haftanın gününü hesapla (0=Pazar, 6=Cumartesi)
    const dateObj = new Date(effectiveDate);
    const dayOfWeek = dateObj.getDay();

    const hasUserLocation =
      userLat !== undefined &&
      userLon !== undefined &&
      !isNaN(userLat) &&
      !isNaN(userLon);

    const pipeline: any[] = [];

    if (hasUserLocation) {
      const geoNearStage: any = {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLon, userLat],
          },
          distanceField: 'distance',
          spherical: true,
          key: 'location.coordinates',
        },
      };

      if (maxDistance) {
        geoNearStage.$geoNear.maxDistance = maxDistance;
      }

      pipeline.push(geoNearStage);
    }

    const matchStage: any = {};

    // Arama sorgusu
    if (q && q.trim()) {
      matchStage.name = { $regex: q.trim(), $options: 'i' };
    }

    if (categories) {
      const categoryIds = categories.split(',').map(id => new Types.ObjectId(id.trim()));
      matchStage.categories = { $in: categoryIds };
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Slots lookup - her zaman yap
    pipeline.push({
      $lookup: {
        from: 'slots',
        localField: '_id',
        foreignField: 'restaurant',
        as: 'allSlots',
      },
    });

    // Discount filtering
    if (discount !== undefined) {
      pipeline.push({
        $match: {
          'allSlots.discount': discount,
        },
      });
    }

    pipeline.push({
      $lookup: {
        from: 'restaurantcategories',
        localField: 'categories',
        foreignField: '_id',
        as: 'categories',
      },
    });

    // Slot'ları o güne göre filtrele
    const slotsProjection = {
      $filter: {
        input: '$allSlots',
        as: 'slot',
        cond: { $in: [dayOfWeek, '$$slot.days'] },
      },
    };

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        rating: 1,
        reviewCount: 1,
        categories: {
          $map: {
            input: '$categories',
            as: 'cat',
            in: { _id: '$$cat._id', name: '$$cat.name' }
          }
        },
        image: { $arrayElemAt: ['$images', 0] },
        location: 1,
        distance: hasUserLocation
          ? {
            $cond: {
              if: { $gt: ['$distance', 0] },
              then: { $round: [{ $divide: ['$distance', 1000] }, 2] },
              else: null,
            },
          }
          : null,
        slots: {
          $map: {
            input: slotsProjection,
            as: 's',
            in: {
              _id: '$$s._id',
              time: '$$s.time',
              discount: '$$s.discount',
              minPersons: '$$s.minPersons',
              maxPersons: '$$s.maxPersons',
              tableQuota: '$$s.tableQuota',
            },
          },
        },
      },
    });

    if (hasUserLocation && sortBy === 'distance') {
      pipeline.push({ $sort: { distance: 1 } });
    }

    pipeline.push({
      $facet: {
        data: [{ $skip: start }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await this.restaurantModel.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      data,
      total,
    };
  }
}
