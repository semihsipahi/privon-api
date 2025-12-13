import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../../models/restaurant.schema';
import { DiscountSchedule } from '../../models/discount-schedule.schema';
import { Review } from '../../models/review.schema';
import { CreateRestaurantDto } from 'src/dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dtos/update-restaurant.dto';
import { ResourceService } from 'src/services/resource.service';
import {
  PublicRestaurantDetailsResponse,
  PublicRestaurantsListResponse,
} from 'src/dtos';
import { calculateDistance } from 'src/utils/distance-calculation.util';

@Injectable()
export class RestaurantService extends ResourceService<
  Restaurant,
  CreateRestaurantDto,
  UpdateRestaurantDto
> {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<Restaurant>,
    @InjectModel(DiscountSchedule.name)
    private scheduleModel: Model<DiscountSchedule>,
    @InjectModel(Review.name)
    private reviewModel: Model<Review>,
  ) {
    super(restaurantModel);
  }

  /**
   * Helper: Calculate restaurant rating and total reviews
   */
  private async calculateRestaurantRating(
    restaurantId: Types.ObjectId,
  ): Promise<{ average: number; total: number }> {
    const ratingResult = await this.reviewModel.aggregate([
      {
        $match: {
          restaurant: restaurantId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (ratingResult.length === 0) {
      return { average: 0, total: 0 };
    }

    return {
      average: Math.round(ratingResult[0].averageRating * 10) / 10,
      total: ratingResult[0].totalReviews,
    };
  }

  /**
   * Helper: Get active discount schedules for a restaurant
   */
  private async getRestaurantSchedules(
    restaurantId: Types.ObjectId,
    limit?: number,
  ): Promise<any[]> {
    const query = this.scheduleModel
      .find({
        restaurant: restaurantId,
        isActive: true,
      })
      .select('startTime endTime discountPercentage')
      .lean();

    if (limit) {
      query.limit(limit);
    }

    return query.exec();
  }

  async getPublicRestaurantDetails(
    id: string,
    userLat?: number,
    userLon?: number,
  ): Promise<PublicRestaurantDetailsResponse> {
    const restaurant = await this.restaurantModel
      .findById(id)
      .populate('category', 'name')
      .populate('owner', 'name email')
      .lean();

    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı');
    }

    const restaurantId = new Types.ObjectId(id);

    // Son 3 yorumu çek
    const reviews = await this.reviewModel
      .find({
        restaurant: restaurantId,
        isActive: true,
      })
      .populate('user', 'maskedName')
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Helper metodlarla rating ve schedules çek (paralel)
    const [rating, schedules] = await Promise.all([
      this.calculateRestaurantRating(restaurantId),
      this.scheduleModel
        .find({
          restaurant: restaurantId,
          isActive: true,
        })
        .select('-__v')
        .lean(),
    ]);

    // Uzaklık hesapla (eğer kullanıcı konumu varsa)
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
      discounts: schedules,
      reviews,
      rating,
      distance,
    };
  }

  async getPublicRestaurantsList(filters: {
    category?: string;

    userLat?: number;
    userLon?: number;
    sortBy?: 'distance' | 'rating';
    _start?: number;
    _end?: number;
  }): Promise<PublicRestaurantsListResponse> {
    const {
      category,

      userLat,
      userLon,
      sortBy,
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

    // MongoDB Aggregation Pipeline oluştur
    const pipeline: any[] = [];

    // 1. Eğer kullanıcı konumu varsa, $geoNear ile başla (MUST be first stage)
    // $geoNear her zaman distance hesaplar, sadece sort farklı olabilir
    if (hasUserLocation) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLon, userLat], // [longitude, latitude]
          },
          distanceField: 'distance', // Distance in meters
          spherical: true,
          key: 'location.coordinates',
        },
      });
    }

    // 2. Match filtreleri
    const matchStage: any = {};
    if (category) {
      matchStage.category = new Types.ObjectId(category);
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 3. Category bilgisini lookup
    pipeline.push({
      $lookup: {
        from: 'restauranttypes',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    });
    pipeline.push({
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true,
      },
    });

    // 4. Rating hesaplama (lookup reviews)
    pipeline.push({
      $lookup: {
        from: 'reviews',
        let: { restaurantId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$restaurant', '$$restaurantId'] },
                  { $eq: ['$isActive', true] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
            },
          },
        ],
        as: 'ratingData',
      },
    });

    // 5. Schedules lookup
    pipeline.push({
      $lookup: {
        from: 'discountschedules',
        let: { restaurantId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$restaurant', '$$restaurantId'] },
                  { $eq: ['$isActive', true] },
                ],
              },
            },
          },
          { $limit: 3 },
          { $project: { startTime: 1, endTime: 1, discountPercentage: 1 } },
        ],
        as: 'discounts',
      },
    });

    // 6. Project - Shape the output
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        category: { _id: '$category._id', name: '$category.name' },
        image: { $arrayElemAt: ['$images', 0] },
        discounts: 1,
        rating: {
          average: {
            $round: [
              {
                $ifNull: [
                  { $arrayElemAt: ['$ratingData.averageRating', 0] },
                  0,
                ],
              },
              1,
            ],
          },
          total: {
            $ifNull: [{ $arrayElemAt: ['$ratingData.totalReviews', 0] }, 0],
          },
        },
        distance: hasUserLocation
          ? {
            $cond: {
              if: { $gt: ['$distance', 0] },
              then: { $round: [{ $divide: ['$distance', 1000] }, 2] }, // Convert meters to km
              else: null,
            },
          }
          : null,
      },
    });

    // 7. Sort
    if (sortBy === 'distance' && hasUserLocation) {
      // Distance'a göre sırala (en yakından en uzağa)
      pipeline.push({ $sort: { distance: 1 } });
    } else if (sortBy === 'rating') {
      // Rating'e göre sırala (en yüksekten en düşüğe)
      pipeline.push({ $sort: { 'rating.average': -1 } });
    }

    // 8. Facet for pagination and total count
    pipeline.push({
      $facet: {
        data: [{ $skip: start }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    // Execute aggregation
    const result = await this.restaurantModel.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      data,
      total,
    };
  }
}
