import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation } from '../../models/reservation.schema';
import { Slot } from '../../models/slot.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateReservationDto } from 'src/dtos/create-reservation.dto';
import { UpdateReservationStatusDto } from 'src/dtos/update-reservation-status.dto';
import { BulkCancelReservationDto } from 'src/dtos/bulk-cancel-reservation.dto';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { Role } from 'src/common/enums/role.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

@Injectable()
export class ReservationService extends ResourceService<
    Reservation,
    CreateReservationDto,
    any
> {
    constructor(
        @InjectModel(Reservation.name)
        private reservationModel: Model<Reservation>,
        @InjectModel(Slot.name)
        private slotModel: Model<Slot>,
    ) {
        super(reservationModel);
    }

    async createReservation(
        createDto: CreateReservationDto,
        user: AuthUser,
    ): Promise<Reservation> {
        const slot = await this.slotModel.findById(createDto.slot);
        if (!slot) {
            throw new NotFoundException('Slot bulunamadı');
        }

        // Kota kontrolü
        const activeReservationsCount = await this.reservationModel.countDocuments({
            slot: createDto.slot,
            date: createDto.date,
            status: {
                $in: [
                    ReservationStatus.PENDING,
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.SEATED,
                ],
            },
        });

        if (activeReservationsCount >= slot.tableQuota) {
            throw new BadRequestException('Bu slot için kapasite doldu');
        }

        // Kişi sayısı kontrolü
        if (
            createDto.personCount < slot.minPersons ||
            createDto.personCount > slot.maxPersons
        ) {
            throw new BadRequestException(
                `Kişi sayısı ${slot.minPersons} ile ${slot.maxPersons} arasında olmalıdır`,
            );
        }

        return await this.create({
            ...createDto,
            restaurant: slot.restaurant,
            customer: new Types.ObjectId(user.userId),
        } as any);
    }

    async getMyReservations(user: AuthUser) {
        const reservations = await this.reservationModel
            .find({ customer: new Types.ObjectId(user.userId) })
            .populate({
                path: 'restaurant',
                select: 'name location images categories',
                populate: {
                    path: 'categories',
                    select: 'name',
                },
            })
            .populate('slot', 'time discount')
            .populate('review', 'rating comment')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return reservations.map((reservation: any) => {
            if (reservation.restaurant && Array.isArray(reservation.restaurant.categories)) {
                reservation.restaurant.categories = reservation.restaurant.categories
                    .filter((c: any) => c && c.name);
            }

            return reservation;
        });
    }

    async getRestaurantReservations(restaurantId: string) {
        return await this.reservationModel
            .find({ restaurant: new Types.ObjectId(restaurantId) })
            .populate('customer', 'fullName phoneNumber imageUrl email')
            .populate('cancelledBy', 'fullName role')
            .populate('slot', 'discount time')
            .sort({ date: -1, createdAt: -1 })
            .lean();
    }

    async updateStatus(
        id: string,
        updateDto: UpdateReservationStatusDto,
        user: AuthUser,
    ) {
        const reservation = await this.reservationModel.findById(id);
        if (!reservation) {
            throw new NotFoundException('Rezervasyon bulunamadı');
        }

        // Ownership check
        if (user.role !== Role.SuperAdmin) {
            if (
                !user.restaurantId ||
                user.restaurantId !== reservation.restaurant.toString()
            ) {
                throw new ForbiddenException('Bu işlem için yetkiniz yok');
            }
        }

        // Completed logic
        if (updateDto.status === ReservationStatus.COMPLETED) {
            if (updateDto.totalAmount === undefined) {
                throw new BadRequestException('Toplam tutar girilmelidir');
            }

            const slot = await this.slotModel.findById(reservation.slot);
            if (!slot) throw new NotFoundException('Slot bulunamadı');

            const totalAmount = updateDto.totalAmount;
            const nonDiscounted = updateDto.nonDiscountedAmount || 0;

            if (nonDiscounted > totalAmount) {
                throw new BadRequestException(
                    'İndirime dahil olmayan tutar toplam tutardan büyük olamaz',
                );
            }

            const discountableAmount = totalAmount - nonDiscounted;
            const discountValue = discountableAmount * (slot.discount / 100);

            reservation.totalAmount = totalAmount;
            reservation.nonDiscountedAmount = nonDiscounted;
            reservation.finalAmount = totalAmount - discountValue;
            reservation.savedAmount = discountValue;
        }

        reservation.status = updateDto.status;
        return await reservation.save();
    }

    async cancelReservation(id: string, user: AuthUser) {
        const reservation = await this.reservationModel.findById(id);
        if (!reservation) {
            throw new NotFoundException('Rezervasyon bulunamadı');
        }

        if (reservation.customer.toString() !== user.userId) {
            throw new ForbiddenException(
                'Sadece kendi rezervasyonunuzu iptal edebilirsiniz',
            );
        }
        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(
                'Sadece beklemedeki rezervasyonlar iptal edilebilir',
            );
        }

        reservation.status = ReservationStatus.CANCELLED;
        return await reservation.save();
    }

    async bulkCancelReservations(dto: BulkCancelReservationDto, user: AuthUser) {
        // Yetki Kontrolü
        if (user.role === Role.RestaurantOwner) {
            if (user.restaurantId !== dto.restaurantId) {
                throw new ForbiddenException(
                    'Sadece kendi restoranınıza ait rezervasyonları iptal edebilirsiniz',
                );
            }
        } else if (user.role !== Role.SuperAdmin) {
            throw new ForbiddenException('Bu işlem için yetkiniz yok');
        }

        const result = await this.reservationModel.updateMany(
            {
                restaurant: new Types.ObjectId(dto.restaurantId),
                date: dto.date,
                status: {
                    $in: [
                        ReservationStatus.PENDING,
                        ReservationStatus.CONFIRMED,
                        ReservationStatus.SEATED,
                    ],
                },
            },
            {
                $set: {
                    status: ReservationStatus.CANCELLED,
                    cancelledBy: new Types.ObjectId(user.userId),
                    cancelledByRole: user.role,
                },
            },
        );

        return {
            message: `${result.modifiedCount} rezervasyon iptal edildi`,
            count: result.modifiedCount,
        };
    }

    async getUserSavings(userId: string) {
        const result = await this.reservationModel.aggregate([
            {
                $match: {
                    customer: new Types.ObjectId(userId),
                    status: ReservationStatus.COMPLETED,
                    savedAmount: { $gt: 0 },
                },
            },
            {
                $lookup: {
                    from: 'restaurants',
                    localField: 'restaurant',
                    foreignField: '_id',
                    as: 'restaurant',
                },
            },
            {
                $unwind: {
                    path: '$restaurant',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'slots',
                    localField: 'slot',
                    foreignField: '_id',
                    as: 'slot',
                },
            },
            {
                $unwind: {
                    path: '$slot',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $facet: {
                    totalStats: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$savedAmount' },
                            },
                        },
                    ],
                    savings: [
                        { $sort: { date: -1 } },
                        {
                            $project: {
                                id: '$_id',
                                _id: 0,
                                savedAmount: { $ifNull: ['$savedAmount', 0] },
                                discountPercent: { $ifNull: ['$slot.discount', 0] },
                                restaurantName: {
                                    $ifNull: ['$restaurant.name', 'Bilinmiyor'],
                                },
                                restaurantImage: {
                                    $arrayElemAt: [
                                        { $ifNull: ['$restaurant.images', []] },
                                        0,
                                    ],
                                },
                                date: 1,
                            },
                        },
                    ],
                },
            },
        ]);

        const totalSavedAmount = result[0]?.totalStats?.[0]?.total || 0;
        const savings = result[0]?.savings || [];

        return {
            totalSavedAmount,
            savings,
        };
    }

    /**
     * SuperAdmin için tamamlanmış rezervasyon raporu
     * Pagination destekler
     */
    async getCompletedReservationsReport(query: {
        _start?: number;
        _end?: number;
        _sort?: string;
        _order?: 'asc' | 'desc';
        restaurantId?: string;
        startDate?: string;
        endDate?: string;
        customerName?: string;
    }) {
        const {
            _start = 0,
            _end = 10,
            _sort = 'date',
            _order = 'desc',
            restaurantId,
            startDate,
            endDate,
            customerName,
        } = query;

        const sortOrder = _order === 'asc' ? 1 : -1;
        const skip = Number(_start);
        const limit = Number(_end) - Number(_start);

        // Base match filter
        const matchFilter: any = { status: ReservationStatus.COMPLETED };

        if (restaurantId) {
            matchFilter.restaurant = new Types.ObjectId(restaurantId);
        }

        if (startDate || endDate) {
            matchFilter.date = {};
            if (startDate) matchFilter.date.$gte = startDate;
            if (endDate) matchFilter.date.$lte = endDate;
        }

        // Aggregation pipeline
        const pipeline: any[] = [
            { $match: matchFilter },

            // Customer lookup
            {
                $lookup: {
                    from: 'users', // customer collection adı
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },

            // Restaurant lookup
            {
                $lookup: {
                    from: 'restaurants',
                    localField: 'restaurant',
                    foreignField: '_id',
                    as: 'restaurant',
                },
            },
            { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },

            // Slot lookup
            {
                $lookup: {
                    from: 'slots',
                    localField: 'slot',
                    foreignField: '_id',
                    as: 'slot',
                },
            },
            { $unwind: { path: '$slot', preserveNullAndEmptyArrays: true } },
        ];

        // Customer name filter (lookup'tan sonra)
        if (customerName) {
            pipeline.push({
                $match: {
                    'customer.fullName': { $regex: customerName, $options: 'i' },
                },
            });
        }

        // Total count için ayrı pipeline
        const countPipeline = [...pipeline, { $count: 'total' }];

        // Data pipeline - sort, skip, limit
        const dataPipeline = [
            ...pipeline,
            { $sort: { [_sort]: sortOrder } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    'customer.fullName': 1,
                    'customer.phoneNumber': 1,
                    'restaurant.name': 1,
                    'slot.time': 1,
                    'slot.discount': 1,
                    date: 1,
                    totalAmount: 1,
                    finalAmount: 1,
                    savedAmount: 1,
                    personCount: 1,
                    createdAt: 1,
                },
            },
        ];

        const [reservations, countResult] = await Promise.all([
            this.reservationModel.aggregate(dataPipeline),
            this.reservationModel.aggregate(countPipeline),
        ]);

        const total = countResult[0]?.total || 0;

        const data = reservations.map((r: any) => ({
            id: r._id,
            customerName: r.customer?.fullName || 'Bilinmiyor',
            customerPhone: r.customer?.phoneNumber || '',
            restaurantName: r.restaurant?.name || 'Bilinmiyor',
            date: r.date,
            time: r.slot?.time || '',
            discountPercent: r.slot?.discount || 0,
            totalAmount: r.totalAmount || 0,
            finalAmount: r.finalAmount || 0,
            userSavings: r.savedAmount || 0,
            personCount: r.personCount,
            createdAt: r.createdAt,
        }));

        return { data, total };
    }
}
