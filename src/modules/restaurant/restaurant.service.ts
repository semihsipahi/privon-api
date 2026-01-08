import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../../models/restaurant.schema';
import { CreateRestaurantDto } from 'src/dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dtos/update-restaurant.dto';
import { ResourceService } from 'src/services/resource.service';
import { calculateDistance } from 'src/utils/distance-calculation.util';

export interface PublicRestaurantDetailsResponse {
  restaurant: any;
  distance: number | null;
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
  ) {
    super(restaurantModel);
  }

  async getPublicRestaurantDetails(
    id: string,
    userLat?: number,
    userLon?: number,
  ): Promise<PublicRestaurantDetailsResponse> {
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

    return {
      restaurant,
      distance,
    };
  }

  async getPublicRestaurantsList(filters: {
    categories?: string;
    discount?: number;
    userLat?: number;
    userLon?: number;
    maxDistance?: number;
    sortBy?: 'distance' | 'rating';
    _start?: number;
    _end?: number;
  }): Promise<PublicRestaurantsListResponse> {
    const {
      categories,
      discount,
      userLat,
      userLon,
      maxDistance,
      sortBy = 'distance',
      _start = 0,
      _end = 10,
    } = filters;
    const start = Number(_start);
    const end = Number(_end);
    const limit = end - start;

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
    if (categories) {
      const categoryIds = categories.split(',').map(id => new Types.ObjectId(id.trim()));
      matchStage.categories = { $in: categoryIds };
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Discount filtering via slots lookup
    if (discount !== undefined) {
      pipeline.push({
        $lookup: {
          from: 'slots',
          localField: '_id',
          foreignField: 'restaurant',
          as: 'slots',
        },
      });
      pipeline.push({
        $match: {
          'slots.discount': discount,
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

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
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
