import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Restaurant } from '../../models/restaurant.schema';
import { Reservation } from '../../models/reservation.schema';
import { Review } from '../../models/review.schema';
import { User } from '../../models/user.schema';
import { CreateRestaurantDto } from 'src/dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dtos/update-restaurant.dto';
import { ResourceService } from 'src/services/resource.service';
import { calculateDistance } from 'src/utils/distance-calculation.util';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

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
    @InjectModel(Reservation.name)
    private reservationModel: Model<Reservation>,
    @InjectModel(Review.name)
    private reviewModel: Model<Review>,
    @InjectModel('User')
    private userModel: Model<User>,
  ) {
    super(restaurantModel);
  }

  async create(data: CreateRestaurantDto, session?: any) {
    if (data.phone) {
      const existingRestaurant = await this.restaurantModel.findOne({ phone: data.phone });
      if (existingRestaurant) {
        throw new BadRequestException('Bu telefon numarası ile kayıtlı bir restoran zaten var.');
      }
    }
    return super.create(data, session);
  }

  async getPublicRestaurantDetails(
    id: string,
    userLat?: number,
    userLon?: number,
    userId?: string,
  ): Promise<any> {
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
    priceLevel?: number;
    cuisineTypes?: string;
    atmosphereTypes?: string;
    collectionTypes?: string;
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
      priceLevel,
      cuisineTypes,
      atmosphereTypes,
      collectionTypes,
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

    // Haftanın gününü hesapla (0=Pazartesi, 6=Pazar)
    const dateObj = new Date(effectiveDate);
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0=Monday, 6=Sunday

    // specificDate karşılaştırması için tarih aralığı
    const startOfDay = new Date(effectiveDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

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

    if (priceLevel) {
      matchStage.priceLevel = priceLevel;
    }

    if (cuisineTypes) {
      matchStage.cuisineTypes = { $in: cuisineTypes.split(',').map((t) => t.trim()) };
    }

    if (atmosphereTypes) {
      matchStage.atmosphereTypes = { $in: atmosphereTypes.split(',').map((t) => t.trim()) };
    }
    if (collectionTypes) {
      matchStage.collectionTypes = { $in: collectionTypes.split(',').map((t) => t.trim()) };
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

    // Rezervasyonları lookup et (aktif olanlar)
    pipeline.push({
      $lookup: {
        from: 'reservations',
        let: { restaurantId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$restaurant', '$$restaurantId'] },
              date: effectiveDate,
              status: { $in: ['pending', 'confirmed', 'seated', 'completed'] },
            },
          },
          {
            $group: {
              _id: '$slot',
              count: { $sum: 1 },
            },
          },
        ],
        as: 'reservationCounts',
      },
    });

    // Slot'ları o güne göre filtrele (specificDate veya days ile eşleşen)
    const slotsProjection = {
      $filter: {
        input: '$allSlots',
        as: 'slot',
        cond: {
          $or: [
            // specificDate ile eşleşen slotlar
            {
              $and: [
                { $gte: ['$$slot.specificDate', startOfDay] },
                { $lt: ['$$slot.specificDate', endOfDay] },
              ],
            },
            // specificDate olmayan ve days ile eşleşen slotlar
            {
              $and: [
                {
                  $or: [
                    { $eq: ['$$slot.specificDate', null] },
                    { $eq: [{ $type: '$$slot.specificDate' }, 'missing'] },
                  ],
                },
                { $in: [dayOfWeek, '$$slot.days'] },
              ],
            },
          ],
        },
      },
    };

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        rating: 1,
        priceLevel: 1,
        reviewCount: 1,
        awards: 1,
        categories: {
          $map: {
            input: '$categories',
            as: 'cat',
            in: { _id: '$$cat._id', name: '$$cat.name' },
          },
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
        workingHours: 1,
        cuisineTypes: 1,
        atmosphereTypes: 1,
        collectionTypes: 1,
        description: 1,
        descriptionEng: 1,
        website: 1,
        instagramUrl: 1,
        facebookUrl: 1,
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
              reservedTables: {
                $let: {
                  vars: {
                    matchedReservation: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$reservationCounts',
                            as: 'rc',
                            cond: { $eq: ['$$rc._id', '$$s._id'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ['$$matchedReservation.count', 0] },
                },
              },
              availableTables: {
                $subtract: [
                  '$$s.tableQuota',
                  {
                    $let: {
                      vars: {
                        matchedReservation: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$reservationCounts',
                                as: 'rc',
                                cond: { $eq: ['$$rc._id', '$$s._id'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: { $ifNull: ['$$matchedReservation.count', 0] },
                    },
                  },
                ],
              },
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


  async getStats(restaurantId: string, reservationDate?: string, salesDate?: string) {
    const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // UTC+3
    const today = reservationDate || now.toISOString().split('T')[0];
    const currentMonth = salesDate || now.toISOString().slice(0, 7);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [year, month] = currentMonth.split('-').map(Number);
    const prevMonth = new Date(year, month - 2, 1).toISOString().slice(0, 7);
    const nextMonthStart = new Date(year, month, 1);
    const prevMonthStart = new Date(year, month - 2, 1);

    const restaurantObjectId = new Types.ObjectId(restaurantId);

    const [
      todayCount,
      yesterdayCount,
      turnoverResults,
      ratingResults,
    ] = await Promise.all([
      this.reservationModel.countDocuments({ restaurant: restaurantObjectId, date: today }),
      this.reservationModel.countDocuments({ restaurant: restaurantObjectId, date: yesterdayStr }),

      this.reservationModel.aggregate([
        {
          $match: {
            restaurant: restaurantObjectId,
            date: { $regex: `^(${currentMonth}|${prevMonth})` },
            status: { $in: ['seated', 'completed'] },
          },
        },
        {
          $group: {
            _id: { $substr: ['$date', 0, 7] },
            total: { $sum: '$finalAmount' },
          },
        },
      ]),

      this.reviewModel.aggregate([
        { $match: { restaurant: restaurantObjectId, isActive: true } },
        {
          $facet: {
            overall: [{ $group: { _id: null, avg: { $avg: '$rating' } } }],
            currentMonth: [
              { $match: { createdAt: { $gte: new Date(`${currentMonth}-01`), $lt: nextMonthStart } } },
              { $group: { _id: null, avg: { $avg: '$rating' } } },
            ],
            prevMonth: [
              { $match: { createdAt: { $gte: prevMonthStart, $lt: new Date(`${currentMonth}-01`) } } },
              { $group: { _id: null, avg: { $avg: '$rating' } } },
            ],
          },
        },
      ]),
    ]);

    const currentTurnover = turnoverResults.find(r => r._id === currentMonth)?.total || 0;
    const prevTurnover = turnoverResults.find(r => r._id === prevMonth)?.total || 0;

    const overallRating = +(ratingResults[0]?.overall[0]?.avg?.toFixed(1) || 0);
    const currentMonthRating = ratingResults[0]?.currentMonth[0]?.avg || 0;
    const prevMonthRating = ratingResults[0]?.prevMonth[0]?.avg || 0;

    const calcChange = (curr: number, prev: number) => {
      if (prev > 0) return Math.round(((curr - prev) / prev) * 100);
      return curr > 0 ? 100 : 0;
    };

    const getTrend = (change: number) => change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

    const dailyChange = calcChange(todayCount, yesterdayCount);
    const turnoverChange = calcChange(currentTurnover, prevTurnover);
    const ratingChange = calcChange(currentMonthRating, prevMonthRating);

    return {
      dailyReservations: {
        value: todayCount,
        percentageChange: dailyChange,
        trend: getTrend(dailyChange),
        date: today,
      },
      monthlyTurnover: {
        value: currentTurnover,
        percentageChange: turnoverChange,
        trend: getTrend(turnoverChange),
        month: currentMonth,
      },
      averageRating: {
        value: overallRating,
        percentageChange: ratingChange,
        trend: getTrend(ratingChange),
      },
    };
  }

  async getCategoryStats() {
    return await this.restaurantModel.aggregate([
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'restaurantcategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          name: '$category.name',
          color: '$category.color',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * SuperAdmin için işletme detay özeti, finansal istatistikler ve rezervasyon geçmişi.
   */
  async getRestaurantSummary(restaurantId: string, query: any = {}) {
    const restaurantObjectId = new Types.ObjectId(restaurantId);
    const _start = Number(query._start) || 0;
    const _end = Number(query._end) || 20;
    const limit = _end - _start;

    // Mevcut ayın başlangıcını bul (UTC+3)
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"

    const [restaurant, stats, latestReservations, totalHistory] = await Promise.all([
      // İşletme temel bilgileri
      this.restaurantModel.findById(restaurantId)
        .populate('owner', 'fullName email phoneNumber')
        .populate('categories', 'name')
        .lean(),

      // Finansal ve rezervasyon istatistikleri
      this.reservationModel.aggregate([
        { $match: { restaurant: restaurantObjectId, status: { $ne: ReservationStatus.REJECTED } } },
        {
          $group: {
            _id: null,
            totalReservations: { $sum: 1 },
            totalTurnover: { 
              $sum: { $cond: [{ $eq: ['$status', ReservationStatus.COMPLETED] }, '$finalAmount', 0] }
            },
            monthlyReservations: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$date', regex: `^${currentMonthStr}` } },
                  1,
                  0
                ]
              }
            },
            monthlyTurnover: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $regexMatch: { input: '$date', regex: `^${currentMonthStr}` } },
                      { $eq: ['$status', ReservationStatus.COMPLETED] }
                    ]
                  },
                  '$finalAmount',
                  0
                ]
              }
            }
          }
        }
      ]),

      // Son rezervasyonlar (paginated)
      this.reservationModel.find({ restaurant: restaurantObjectId })
        .populate('customer', 'fullName phoneNumber')
        .populate('slot', 'time discount')
        .sort({ date: -1, createdAt: -1 })
        .skip(_start)
        .limit(limit)
        .lean(),

      // Toplam geçmiş sayısı
      this.reservationModel.countDocuments({ restaurant: restaurantObjectId })
    ]);

    if (!restaurant) {
      throw new NotFoundException('İşletme bulunamadı');
    }

    const aggregatedStats = stats[0] || { 
      totalReservations: 0, 
      totalTurnover: 0, 
      monthlyReservations: 0, 
      monthlyTurnover: 0 
    };

    return {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        owner: restaurant.owner,
        phone: restaurant.phone,
        email: restaurant.email,
        categories: restaurant.categories,
        images: restaurant.images,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
      },
      stats: {
        totalReservations: aggregatedStats.totalReservations,
        totalTurnover: aggregatedStats.totalTurnover,
        monthlyReservations: aggregatedStats.monthlyReservations,
        monthlyTurnover: aggregatedStats.monthlyTurnover,
      },
      history: {
        data: latestReservations.map((res: any) => ({
          id: res._id,
          date: res.date,
          customerName: res.customer?.fullName || 'Bilinmiyor',
          status: res.status,
          finalAmount: res.finalAmount || 0,
          personCount: res.personCount,
          time: res.slot?.time || '',
        })),
        total: totalHistory
      }
    };
  }
}
