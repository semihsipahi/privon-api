import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review } from '../../models/review.schema';
import {
  SlotReservation,
} from '../../models/slot-reservation.schema';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto } from '../../dtos';
import { ResourceService } from 'src/services/resource.service';
import { Restaurant } from 'src/models/restaurant.schema';
import { ReservationStatus } from 'src/common/enums/discount.enum';

@Injectable()
export class ReviewService extends ResourceService<
  Review,
  CreateReviewDto,
  UpdateReviewDto
> {
  constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<Review>,
    @InjectModel(SlotReservation.name)
    private slotReservationModel: Model<SlotReservation>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<Restaurant>,
  ) {
    super(reviewModel);
  }

  async createReview(
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    const { slotReservation, restaurant, rating, comment } = createReviewDto;

    // Rezervasyonun var olup olmadığını ve kullanıcıya ait olup olmadığını kontrol et
    const reservation = await this.slotReservationModel
      .findById(slotReservation)
      .populate('schedule');

    if (!reservation) {
      throw new NotFoundException('Rezervasyon bulunamadı');
    }

    if (reservation.user.toString() !== userId) {
      throw new ForbiddenException('Bu rezervasyon size ait değil');
    }

    // Rezervasyonun bu restoran için olup olmadığını kontrol et
    if (reservation.restaurant.toString() !== restaurant) {
      throw new BadRequestException(
        'Bu rezervasyon bu restoran için yapılmamış',
      );
    }

    // Rezervasyonun kullanılıp kullanılmadığını kontrol et (validated olmalı)
    if (reservation.status !== ReservationStatus.VALIDATED) {
      throw new BadRequestException('Bu rezervasyon henüz kullanılmamış');
    }

    // Bu rezervasyon için daha önce yorum yapılıp yapılmadığını kontrol et
    const existingReview = await this.reviewModel.findOne({ slotReservation });
    if (existingReview) {
      throw new BadRequestException(
        'Bu rezervasyon için zaten yorum yapılmış',
      );
    }

    const review = new this.reviewModel({
      user: userId,
      restaurant,
      slotReservation,
      rating,
      comment,
    });

    return review.save();
  }

  async findByRestaurant(
    restaurantId: string,
    _start = 0,
    _end = 10,
  ): Promise<{ data: any[]; total: number }> {
    const start = Number(_start) || 0;
    const end = Number(_end) || start + 10;
    const limit = end - start;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ restaurant: restaurantId, isActive: true })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments({
        restaurant: restaurantId,
        isActive: true,
      }),
    ]);

    return {
      data: reviews,
      total,
    };
  }

  async findByUser(
    userId: string,
    _start = 0,
    _end = 10,
  ): Promise<{ data: any[]; total: number }> {
    const start = Number(_start) || 0;
    const end = Number(_end) || start + 10;
    const limit = end - start;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ user: userId, isActive: true })
        .populate('restaurant', 'name')
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments({ user: userId, isActive: true }),
    ]);

    return {
      data: reviews,
      total,
    };
  }

  async updateReview(
    reviewId: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Yorum bulunamadı');
    }

    if (review.user.toString() !== userId) {
      throw new ForbiddenException('Bu yorumu güncelleme yetkiniz yok');
    }

    if (review.restaurantReply) {
      throw new BadRequestException(
        'Restoran cevap verdikten sonra yorum düzenlenemez',
      );
    }

    Object.assign(review, updateReviewDto);
    return review.save();
  }

  async replyToReview(
    reviewId: string,
    userId: string,
    replyReviewDto: ReplyReviewDto,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Yorum bulunamadı');
    }

    // Kullanıcının restoranını bul
    const restaurant = await this.restaurantModel.findOne({ owner: userId });

    if (!restaurant) {
      throw new ForbiddenException('Kullanıcıya ait restoran bulunamadı');
    }

    // Yorumun bu restorana ait olup olmadığını kontrol et
    if (review.restaurant.toString() !== restaurant._id.toString()) {
      throw new ForbiddenException(
        'Sadece kendi restoranınıza ait yorumlara cevap verebilirsiniz',
      );
    }

    review.restaurantReply = replyReviewDto.restaurantReply;
    review.repliedAt = new Date();
    return review.save();
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Yorum bulunamadı');
    }

    // Kullanıcı kendi yorumunu silebilir
    if (review.user.toString() !== userId) {
      throw new ForbiddenException('Bu yorumu silme yetkiniz yok');
    }

    review.isActive = false;
    await review.save();
  }

  async getAverageRating(
    restaurantId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await this.reviewModel.aggregate([
      { $match: { restaurant: restaurantId, isActive: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
    };
  }
}
