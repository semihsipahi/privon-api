import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from '../../models/review.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { Reservation } from '../../models/reservation.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateReviewDto } from 'src/dtos/create-review.dto';
import { UpdateReviewDto } from 'src/dtos/update-review.dto';
import { ReplyReviewDto } from 'src/dtos/reply-review.dto';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { Role } from 'src/common/enums/role.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

@Injectable()
export class ReviewService extends ResourceService<Review, CreateReviewDto, any> {
    constructor(
        @InjectModel(Review.name)
        private reviewModel: Model<Review>,
        @InjectModel(Restaurant.name)
        private restaurantModel: Model<Restaurant>,
        @InjectModel(Reservation.name)
        private reservationModel: Model<Reservation>,
    ) {
        super(reviewModel);
    }

    async createReview(createDto: CreateReviewDto, user: AuthUser): Promise<Review> {
        const reservation = await this.reservationModel.findById(createDto.reservation);
        if (!reservation) {
            throw new NotFoundException('Rezervasyon bulunamadı');
        }

        if (reservation.customer.toString() !== user.userId) {
            throw new ForbiddenException('Sadece kendi rezervasyonunuzu değerlendirebilirsiniz');
        }

        if (reservation.status !== ReservationStatus.COMPLETED) {
            throw new BadRequestException('Sadece tamamlanmış rezervasyonlar değerlendirilebilir');
        }

        const existingReview = await this.reviewModel.findOne({
            reservation: createDto.reservation,
        });
        if (existingReview) {
            throw new BadRequestException('Bu rezervasyon için zaten değerlendirme yapılmış');
        }

        // isActive: false by default in schema
        return await this.create({
            ...createDto,
            restaurant: reservation.restaurant,
            customer: new Types.ObjectId(user.userId),
        } as any);
    }

    async approveReview(id: string) {
        const review = await this.reviewModel.findById(id);
        if (!review) {
            throw new NotFoundException('Değerlendirme bulunamadı');
        }

        review.isActive = true;
        await review.save();

        await this.calculateRestaurantRating(review.restaurant as unknown as Types.ObjectId);

        return review;
    }

    async getPendingReviews() {
        return await this.reviewModel
            .find({ isActive: false })
            .populate('restaurant', 'name')
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .lean();
    }

    async replyToReview(id: string, replyDto: ReplyReviewDto, user: AuthUser) {
        const review = await this.reviewModel.findById(id);
        if (!review) {
            throw new NotFoundException('Değerlendirme bulunamadı');
        }

        if (!review.isActive) {
            throw new BadRequestException('Sadece onaylanmış değerlendirmelere yanıt verilebilir');
        }

        // Ownership check for restaurant owner
        if (user.role !== Role.SuperAdmin) {
            if (!user.restaurantId || user.restaurantId !== review.restaurant.toString()) {
                throw new ForbiddenException('Sadece kendi restoranınıza ait değerlendirmelere yanıt verebilirsiniz');
            }
        }

        review.reply = replyDto.reply;
        return await review.save();
    }

    async updateUserReview(id: string, updateDto: UpdateReviewDto, userId: string) {
        const review = await this.reviewModel.findById(id);

        if (!review) {
            throw new NotFoundException('Değerlendirme bulunamadı');
        }

        if (review.customer.toString() !== userId) {
            throw new ForbiddenException(
                'Sadece kendi değerlendirmenizi düzenleyebilirsiniz',
            );
        }

        const wasActive = review.isActive;

        review.rating = updateDto.rating || review.rating;
        review.comment = updateDto.comment || review.comment;
        review.isActive = false;

        await review.save();

        if (wasActive) {
            await this.calculateRestaurantRating(
                review.restaurant as unknown as Types.ObjectId,
            );
        }

        return review;
    }

    async deleteUserReview(id: string, userId: string) {
        const review = await this.reviewModel.findById(id);

        if (!review) {
            throw new NotFoundException('Değerlendirme bulunamadı');
        }

        if (review.customer.toString() !== userId) {
            throw new ForbiddenException(
                'Sadece kendi değerlendirmenizi silebilirsiniz',
            );
        }

        const wasActive = review.isActive;
        const restaurantId = review.restaurant;

        await this.reviewModel.findByIdAndDelete(id);

        if (wasActive) {
            await this.calculateRestaurantRating(
                restaurantId as unknown as Types.ObjectId,
            );
        }

        return { success: true };
    }

    async getRestaurantReviews(restaurantId: string) {
        return await this.reviewModel
            .find({ restaurant: new Types.ObjectId(restaurantId), isActive: true })
            .populate('customer', 'maskedName')
            .sort({ createdAt: -1 })
            .lean();
    }

    async getUserReviews(userId: string) {
        const reviews = await this.reviewModel
            .find({ customer: new Types.ObjectId(userId) })
            .populate({
                path: 'restaurant',
                select: '_id name images categories rating reviewCount',
                populate: {
                    path: 'categories',
                    select: 'name',
                },
            })
            .sort({ createdAt: -1 })
            .lean();

        return reviews.map((review: any) => {
            if (review.restaurant && review.restaurant.categories) {
                review.restaurant.categories = review.restaurant.categories.map(
                    (c: any) => c.name,
                );
            }
            return review;
        });
    }

    private async calculateRestaurantRating(restaurantId: Types.ObjectId) {
        const result = await this.reviewModel.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    isActive: true,
                },
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    count: { $sum: 1 },
                },
            },
        ]);

        const rating = result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
        const count = result.length > 0 ? result[0].count : 0;

        await this.restaurantModel.findByIdAndUpdate(restaurantId, {
            rating: rating,
            reviewCount: count,
        });
    }
}
