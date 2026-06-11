import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Reservation } from '../../models/reservation.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { Slot } from '../../models/slot.schema';
import { User } from '../../models/user.schema';
import {
  DelayedNotificationJob,
  DelayedNotificationJobStatus,
  DelayedNotificationJobType,
} from '../../models/delayed-notification-job.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateReservationDto } from 'src/dtos/create-reservation.dto';
import { UpdateReservationStatusDto } from 'src/dtos/update-reservation-status.dto';
import { BulkCancelReservationDto } from 'src/dtos/bulk-cancel-reservation.dto';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { Role } from 'src/common/enums/role.enum';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';
import { MailService } from '../mail/mail.service';
import { CustomException } from 'src/common/exceptions/custom.exception';
import { NotificationService } from '../notification/notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<Restaurant>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    @InjectModel(DelayedNotificationJob.name)
    private delayedJobModel: Model<DelayedNotificationJob>,
  ) {
    super(reservationModel);
  }

  async createReservation(
    createDto: CreateReservationDto,
    user: AuthUser,
  ): Promise<Reservation> {
    const fullUser = await this.userModel.findById(user.userId);

    if (
      fullUser?.reservationBanExpiresAt &&
      fullUser.reservationBanExpiresAt > new Date()
    ) {
      throw new CustomException(
        'No-show (Gelmeme) cezası nedeniyle rezervasyon yapmanız 7 gün süreyle kısıtlanmıştır.',
        403,
      );
    }

    const isBetaMode = this.configService.get<string>('BETA_MODE') === 'true';

    if (!isBetaMode) {
      if (user.role === Role.User) {
        throw new CustomException(
          'Rezervasyon yapabilmek için ödeme yapmanız gerekmektedir.',
          403,
        );
      }

      if (user.role === Role.TrialUser || user.role === Role.PremiumUser) {
        if (fullUser?.subscriptionExpiresAt) {
          const reservationDate = new Date(createDto.date);
          const expiresAt = new Date(fullUser.subscriptionExpiresAt);

          if (reservationDate > expiresAt) {
            throw new CustomException(
              'Seçtiğiniz tarih abonelik sürenizin dışındadır. Lütfen aboneliğinizi yenileyin.',
              403,
            );
          }
        }
      }
    }

    const slot = await this.slotModel.findById(createDto.slot);
    if (!slot) {
      throw new CustomException('Slot bulunamadı', 404);
    }

    const reservationIsoString = `${createDto.date}T${slot.time}:00+03:00`;
    const reservationDateTime = new Date(reservationIsoString);

    const now = new Date();

    // 14 gün sınırı kontrolü
    const fourteenDaysLater = new Date(now);
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);

    if (reservationDateTime > fourteenDaysLater) {
      throw new CustomException(
        'En fazla 14 gün sonrası için rezervasyon yapabilirsiniz.',
        400,
      );
    }

    const timeDiffCreate = reservationDateTime.getTime() - now.getTime();
    const hoursDiffCreate = timeDiffCreate / (1000 * 60 * 60);

    if (hoursDiffCreate < 1) {
      throw new CustomException(
        'Rezervasyon saatine 1 saatten az kaldığı için rezervasyon yapılamaz.',
        400,
      );
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
      throw new CustomException('Bu slot için kapasite doldu', 400);
    }

    // Günlük rezervasyon sınırı kontrolü (Kullanıcı aynı gün sadece 1 rezervasyon yapabilir)
    const userReservationsOnDate = await this.reservationModel.countDocuments({
      customer: new Types.ObjectId(user.userId),
      date: createDto.date,
      status: {
        $in: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.SEATED,
        ],
      },
    });

    if (userReservationsOnDate > 0) {
      throw new CustomException(
        'Aynı gün için zaten aktif bir rezervasyonunuz bulunmaktadır.',
        400,
      );
    }
    const userReservationsCount = await this.reservationModel.countDocuments({
      customer: new Types.ObjectId(user.userId),
      status: {
        $in: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.SEATED,
        ],
      },
    });

    if (userReservationsCount >= 2) {
      throw new CustomException(
        'En fazla 2 aktif rezervasyon yapabilirsiniz.',
        400,
      );
    }

    // Kişi sayısı kontrolü
    if (
      createDto.personCount < slot.minPersons ||
      createDto.personCount > slot.maxPersons
    ) {
      throw new CustomException(
        `Kişi sayısı ${slot.minPersons} ile ${slot.maxPersons} arasında olmalıdır`,
        400,
      );
    }

    const reservation = await this.create({
      ...createDto,
      restaurant: slot.restaurant,
      customer: new Types.ObjectId(user.userId),
    } as any);

    // --- Anında Müşteri (Üye) Rezervasyon Onay Bildirimi ---
    await this.sendCustomerNotification(reservation._id.toString(), 'NEW');

    // --- 5 Dakika Gecikmeli Yeni Rezervasyon Bildirimi (Restoran İçin) ---
    const executeAt = new Date();
    executeAt.setMinutes(executeAt.getMinutes() + 5);

    await this.delayedJobModel.create({
      reservation: reservation._id,
      executeAt,
      type: DelayedNotificationJobType.NEW_RESERVATION,
      status: DelayedNotificationJobStatus.PENDING,
    });

    // --- Müşteri (Üye) Hatırlatma Bildirimleri (Cron Job İçin) ---
    const hoursUntilReservation =
      (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilReservation >= 36) {
      // 24 Saat Öncesi Hatırlatması
      const executeAt24h = new Date(reservationDateTime);
      executeAt24h.setHours(executeAt24h.getHours() - 24);

      await this.delayedJobModel.create({
        reservation: reservation._id,
        executeAt: executeAt24h,
        type: DelayedNotificationJobType.USER_REMINDER_24H,
        status: DelayedNotificationJobStatus.PENDING,
      });
    }

    if (hoursUntilReservation > 4) {
      // 4 Saat Öncesi Hatırlatması
      const executeAt4h = new Date(reservationDateTime);
      executeAt4h.setHours(executeAt4h.getHours() - 4);

      await this.delayedJobModel.create({
        reservation: reservation._id,
        executeAt: executeAt4h,
        type: DelayedNotificationJobType.USER_REMINDER_4H,
        status: DelayedNotificationJobStatus.PENDING,
      });
    }

    return reservation;
  }

  async getMyReservations(user: AuthUser) {
    const reservations = await this.reservationModel
      .find({
        customer: new Types.ObjectId(user.userId),
        status: { $ne: ReservationStatus.REJECTED },
      })
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
      if (
        reservation.restaurant &&
        Array.isArray(reservation.restaurant.categories)
      ) {
        reservation.restaurant.categories =
          reservation.restaurant.categories.filter((c: any) => c && c.name);
      }

      return reservation;
    });
  }

  async getRestaurantReservations(restaurantId: string) {
    return await this.reservationModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
        status: { $ne: ReservationStatus.REJECTED },
      })
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
        throw new CustomException('Bu işlem için yetkiniz yok', 403);
      }
    }

    // Completed logic
    if (updateDto.status === ReservationStatus.COMPLETED) {
      if (updateDto.totalAmount === undefined) {
        throw new CustomException('Toplam tutar girilmelidir', 400);
      }

      const slot = await this.slotModel.findById(reservation.slot);
      if (!slot) throw new CustomException('Slot bulunamadı', 404);

      const totalAmount = updateDto.totalAmount;
      const nonDiscounted = updateDto.nonDiscountedAmount || 0;

      if (nonDiscounted > totalAmount) {
        throw new CustomException(
          'İndirime dahil olmayan tutar toplam tutardan büyük olamaz',
          400,
        );
      }

      const discountableAmount = totalAmount - nonDiscounted;
      const discountValue = discountableAmount * (slot.discount / 100);

      reservation.totalAmount = totalAmount;
      reservation.nonDiscountedAmount = nonDiscounted;
      reservation.finalAmount = totalAmount - discountValue;
      reservation.savedAmount = discountValue;

      // Tamamlanan rezervasyon sayacını artır (davet kodu hakkı için)
      await this.userModel.findByIdAndUpdate(reservation.customer, {
        $inc: { completedReservationCount: 1 },
      });
    }

    // NO_SHOW Logic
    if (
      updateDto.status === ReservationStatus.NO_SHOW &&
      reservation.status !== ReservationStatus.NO_SHOW
    ) {
      const customer = await this.userModel.findById(reservation.customer);
      if (customer) {
        customer.noShowDates.push(new Date());

        const noShowCount = customer.noShowDates.length;

        if (noShowCount === 1) {
          await this.mailService.sendEmail({
            to: customer.email,
            subject: 'Rezervasyon Uyarısı',
            html: `
                            <h3>Sayın Müşterimiz,</h3>
                            <p>Rezervasyonunuza gelmediğiniz tespit edilmiştir.</p>
                            <p>Tekrarı durumunda 7 gün süreyle rezervasyon yapmanız kısıtlanacaktır.</p>
                            <p>Anlayışınız için teşekkür ederiz.</p>
                        `,
            account: 'info',
          });
          console.log(
            `User ${customer._id} warned for first no-show via email`,
          );
        } else if (noShowCount >= 2) {
          // 7 Gün Ban
          const banDate = new Date();
          banDate.setDate(banDate.getDate() + 7);
          customer.reservationBanExpiresAt = banDate;
          console.log(`User ${customer._id} banned until ${banDate}`);
        }

        await customer.save();
      }
    }

    reservation.status = updateDto.status;
    return await reservation.save();
  }

  async adminDeleteReservation(id: string): Promise<{ message: string }> {
    const reservation = await this.reservationModel.findById(id);
    if (!reservation) {
      throw new NotFoundException('Rezervasyon bulunamadı');
    }
    await this.reservationModel.deleteOne({ _id: id });
    return { message: 'Rezervasyon silindi' };
  }

  async deletePhantomRezervem(): Promise<{ deleted: number }> {
    const result = await this.reservationModel.deleteMany({
      source: 'rezervem',
      $or: [
        { confirmationCode: '' },
        { confirmationCode: null },
        { confirmationCode: { $exists: false } },
      ],
    });
    return { deleted: result.deletedCount };
  }

  async saveRezervemReservation(
    userId: string,
    data: {
      restaurantId: string;
      date: string;
      time: string;
      pax: number;
      confirmationCode?: string;
      rezervemId?: string;
      rezervemSlug?: string;
      areaName?: string;
      note?: string;
    },
  ): Promise<Reservation> {
    return this.reservationModel.create({
      source: 'rezervem',
      customer: new Types.ObjectId(userId),
      restaurant: new Types.ObjectId(data.restaurantId),
      date: data.date,
      time: data.time,
      personCount: data.pax,
      confirmationCode: data.confirmationCode,
      rezervemId: data.rezervemId,
      rezervemSlug: data.rezervemSlug,
      areaName: data.areaName,
      note: data.note,
      status: ReservationStatus.CONFIRMED,
    } as any);
  }

  async cancelReservation(id: string, user: AuthUser) {
    const reservation = await this.reservationModel.findById(id);
    if (!reservation) {
      throw new CustomException('Rezervasyon bulunamadı', 404);
    }

    if (reservation.customer.toString() !== user.userId) {
      throw new CustomException(
        'Sadece kendi rezervasyonunuzu iptal edebilirsiniz',
        403,
      );
    }

    // Bekleyen bildirim joblarını iptal et
    await this.delayedJobModel.updateMany(
      {
        reservation: new Types.ObjectId(id),
        status: DelayedNotificationJobStatus.PENDING,
      },
      { $set: { status: DelayedNotificationJobStatus.CANCELLED } },
    );

    // Rezervasyonu MongoDB'den komple sil
    await this.reservationModel.findByIdAndDelete(id);

    return { message: 'Rezervasyon başarıyla iptal edildi.' };
  }

  async bulkCancelReservations(dto: BulkCancelReservationDto, user: AuthUser) {
    // Yetki Kontrolü
    if (user.role === Role.RestaurantOwner) {
      if (user.restaurantId !== dto.restaurantId) {
        throw new CustomException(
          'Sadece kendi restoranınıza ait rezervasyonları iptal edebilirsiniz',
          403,
        );
      }
    } else if (user.role !== Role.SuperAdmin) {
      throw new CustomException('Bu işlem için yetkiniz yok', 403);
    }

    const reservationsToCancel = await this.reservationModel.find({
      restaurant: new Types.ObjectId(dto.restaurantId),
      date: dto.date,
      status: {
        $in: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.SEATED,
        ],
      },
    });

    const cancelStatus = ReservationStatus.CANCELLED;

    const result = await this.reservationModel.updateMany(
      {
        _id: { $in: reservationsToCancel.map((r) => r._id) },
      },
      {
        $set: {
          status: cancelStatus,
          cancelledBy: new Types.ObjectId(user.userId),
          cancelledByRole: user.role,
        },
      },
    );

    for (const res of reservationsToCancel) {
      const id = res._id.toString();
      const delayedJob = await this.delayedJobModel.findOne({
        reservation: new Types.ObjectId(id),
        type: DelayedNotificationJobType.NEW_RESERVATION,
        status: DelayedNotificationJobStatus.PENDING,
      });

      // Müşteriye anında iptal bildirimi
      await this.sendCustomerNotification(id, 'CANCEL');

      // Müşteri için bekleyen Hatırlatma (24h veya 4h) bildirimlerini iptal et
      await this.delayedJobModel.updateMany(
        {
          reservation: new Types.ObjectId(id),
          type: {
            $in: [
              DelayedNotificationJobType.USER_REMINDER_24H,
              DelayedNotificationJobType.USER_REMINDER_4H,
            ],
          },
          status: DelayedNotificationJobStatus.PENDING,
        },
        { $set: { status: DelayedNotificationJobStatus.CANCELLED } },
      );

      if (delayedJob) {
        // 5 dakika dolmadan iptal edildi -> Restorana Yeni Rezervasyon gitmeyecek
        delayedJob.status = DelayedNotificationJobStatus.CANCELLED;
        await delayedJob.save();
      } else {
        // 5 dakika dolduktan sonra iptal edildi -> Restorana İptal Bildirimi gitmeli
        try {
          await this.sendRestaurantNotification(id, 'CANCEL');
        } catch (err) {
          console.error(
            'Error sending delayed cancellation notification in bulk:',
            err,
          );
        }
      }
    }

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
                  $arrayElemAt: [{ $ifNull: ['$restaurant.images', []] }, 0],
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

  /**
   * SuperAdmin için belirli bir kullanıcının rezervasyon geçmişi ve harcama istatistiklerini döner.
   */
  async getUserReservationSummary(userId: string, query: any = {}) {
    const customerId = new Types.ObjectId(userId);
    const _start = Number(query._start) || 0;
    const _end = Number(query._end) || 20;
    const limit = _end - _start;

    // Mevcut ayın başlangıcını bul (UTC+3 dikkate alınarak orjinal kodda Date kullanılıyor)
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

    const [reservations, stats, totalHistory] = await Promise.all([
      // Rezervasyon geçmişi (paginated)
      this.reservationModel
        .find({ customer: customerId })
        .populate('restaurant', 'name')
        .populate('slot', 'time discount')
        .sort({ date: -1, createdAt: -1 })
        .skip(_start)
        .limit(limit)
        .lean(),

      // Finansal istatistikler (Aggregation)
      this.reservationModel.aggregate([
        {
          $match: { customer: customerId, status: ReservationStatus.COMPLETED },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$finalAmount' },
            totalSaved: { $sum: '$savedAmount' },
            monthlySpent: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: { input: '$date', regex: `^${currentMonth}` },
                  },
                  '$finalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Toplam geçmiş sayısı
      this.reservationModel.countDocuments({ customer: customerId }),
    ]);

    const financialStats = stats[0] || {
      totalSpent: 0,
      totalSaved: 0,
      monthlySpent: 0,
    };

    return {
      stats: {
        totalSpent: financialStats.totalSpent || 0,
        totalSaved: financialStats.totalSaved || 0,
        monthlySpent: financialStats.monthlySpent || 0,
      },
      history: {
        data: reservations.map((res: any) => ({
          id: res._id,
          date: res.date,
          restaurantName: res.restaurant?.name || 'Bilinmiyor',
          status: res.status,
          finalAmount: res.finalAmount || 0,
          savedAmount: res.savedAmount || 0,
          personCount: res.personCount,
          time: res.slot?.time || '',
        })),
        total: totalHistory,
      },
    };
  }

  private async sendRestaurantNotification(
    reservationId: string,
    type: 'NEW' | 'CANCEL',
  ) {
    try {
      const reservation = await this.reservationModel
        .findById(reservationId)
        .select('date slot customer restaurant personCount');
      if (!reservation) return;

      const slot = await this.slotModel
        .findById(reservation.slot)
        .select('time');

      const fullUser = await this.userModel
        .findById(reservation.customer)
        .select('fullName');

      const restaurant = await this.restaurantModel
        .findById(reservation.restaurant)
        .select('name email owner')
        .populate({
          path: 'owner',
          select: '_id notification',
        });
      const restaurantOwner = restaurant?.owner as any as User;

      if (!slot || !fullUser || !restaurant) return;

      const resDateStr = new Date(reservation.date).toLocaleDateString(
        'tr-TR',
        { day: 'numeric', month: 'long', year: 'numeric' },
      );

      let pushTitle = '';
      let pushBody = '';
      let emailSubject = '';
      let emailHtml = '';

      if (type === 'NEW') {
        pushTitle = 'Yeni Rezervasyon';
        pushBody = `${fullUser.fullName} - ${resDateStr}, ${slot.time} (${reservation.personCount} Kişi). İşlem detayları için panele gidin.`;
        emailSubject = `YENİ REZERVASYON | ${fullUser.fullName} - ${resDateStr} ${slot.time}`;
        emailHtml = `
                    <p>Sayın ${restaurant.name} Yönetimi,</p>
                    <p>PRIVON sistemi üzerinden yeni bir rezervasyon kaydı alınmıştır.</p>
                    <br/>
                    <b>Rezervasyon Bilgileri:</b><br/>
                    Misafir: ${fullUser.fullName}<br/>
                    Tarih: ${resDateStr}<br/>
                    Saat: ${slot.time}<br/>
                    Kişi: ${reservation.personCount}<br/>
                    <br/>
                    <p><b>Operasyon Talimatı:</b> İlgili ayrıcalıklar hesap kapatma aşamasında sisteminizde otomatik olarak uygulanacaktır. Misafirden masada herhangi bir sözlü teyit istenmemelidir.</p>
                    <p><b>Panel ve Destek:</b> Rezervasyon detaylarını yönetmek için Restoran Paneline giriş yapabilirsiniz. Misafirle iletişime geçilmesi gereken operasyonel durumlarda veya destek taleplerinizde doğrudan PRIVON Destek Ekibi ile irtibat kurunuz.</p>
                    <br/>
                    <p>İyi çalışmalar,</p>
                    <p>PRIVON</p>
                `;
      } else if (type === 'CANCEL') {
        pushTitle = 'Rezervasyon İptali';
        pushBody = `${fullUser.fullName} - ${resDateStr}, ${slot.time} (${reservation.personCount} Kişi) rezervasyonu iptal edilmiştir. Güncel durum için panele gidin.`;
        emailSubject = `REZERVASYON İPTALİ | ${fullUser.fullName} - ${resDateStr} ${slot.time}`;
        emailHtml = `
                    <p>Sayın ${restaurant.name} Yönetimi,</p>
                    <p>PRIVON sistemi üzerinden oluşturulan aşağıdaki rezervasyon kaydı iptal edilmiştir.</p>
                    <br/>
                    <b>İptal Edilen Rezervasyon Bilgileri:</b><br/>
                    Misafir: ${fullUser.fullName}<br/>
                    Tarih: ${resDateStr}<br/>
                    Saat: ${slot.time}<br/>
                    Kişi: ${reservation.personCount}<br/>
                    <br/>
                    <p><b>Sistem Bilgilendirmesi:</b> İlgili iptal işlemi panelinize otomatik olarak yansıtılmış olup, söz konusu kapasite sistem üzerinde yeniden müsait duruma getirilmiştir. Bu işlem için tarafınızca herhangi bir manuel güncelleme yapılmasına gerek yoktur.</p>
                    <p><b>Panel ve Destek:</b> Güncel rezervasyon durumunuzu görüntülemek için Restoran Paneline giriş yapabilirsiniz. Herhangi bir operasyonel destek talebinizde doğrudan PRIVON Destek Ekibi ile irtibat kurunuz.</p>
                    <br/>
                    <p>İyi çalışmalar,</p>
                    <p>PRIVON</p>
                `;
      }

      // OneSignal Push Notification (Restaurant Owner)
      if (
        restaurantOwner?._id &&
        restaurantOwner?.notification?.app !== false
      ) {
        await this.notificationService.sendNotification({
          userIds: [restaurantOwner._id.toString()],
          title: pushTitle,
          body: pushBody,
          data: {
            type: type === 'NEW' ? 'NEW_RESERVATION' : 'CANCELLED_RESERVATION',
            reservationId: reservation._id,
          },
        });
      }

      // Email Bildirimi (Restaurant)
      if (restaurant?.email && restaurantOwner?.notification?.email !== false) {
        await this.mailService.sendEmail({
          to: restaurant.email,
          subject: emailSubject,
          html: emailHtml,
          account: 'info',
        });
      }
    } catch (err) {
      console.error(`Error sending ${type} reservation notification:`, err);
    }
  }

  private async sendCustomerNotification(
    reservationId: string,
    type: 'NEW' | 'CANCEL' | 'REMINDER_24H' | 'REMINDER_4H',
  ) {
    try {
      const reservation = await this.reservationModel
        .findById(reservationId)
        .select('date slot customer restaurant personCount');
      if (!reservation) return;

      const slot = await this.slotModel
        .findById(reservation.slot)
        .select('time');

      const fullUser = await this.userModel
        .findById(reservation.customer)
        .select('fullName email notification');

      const restaurant = await this.restaurantModel
        .findById(reservation.restaurant)
        .select('name location');

      if (!slot || !fullUser || !restaurant) return;

      const resDateStr = new Date(reservation.date).toLocaleDateString(
        'tr-TR',
        { day: 'numeric', month: 'long', year: 'numeric' },
      );

      let pushTitle = '';
      let pushBody = '';
      let emailSubject = '';
      let emailHtml = '';

      const mapsLink = restaurant.location?.coordinates
        ? `https://maps.google.com/?q=${restaurant.location.coordinates[1]},${restaurant.location.coordinates[0]}`
        : '';

      const mapsText = mapsLink
        ? `<a href="${mapsLink}">Google Haritalar'da Gör</a>`
        : '';

      if (type === 'NEW') {
        pushTitle = 'Rezervasyonunuz Onaylandı';
        pushBody = `${restaurant.name} rezervasyonunuz onaylanmıştır (${resDateStr}, ${slot.time} - ${reservation.personCount} Kişi). İşlem detayları e-posta adresinize iletilmiştir.`;
        emailSubject = `Rezervasyon Onayı: ${restaurant.name}, ${resDateStr} | PRIVON`;
        emailHtml = `
                    <p>Sayın ${fullUser.fullName},</p>
                    <p>PRIVON üzerinden oluşturduğunuz ${restaurant.name} rezervasyonunuz onaylanmıştır. İlgili detayları aşağıda bilgilerinize sunarız.</p>
                    <br/>
                    <b>Rezervasyon Detayları:</b><br/>
                    Mekan: ${restaurant.name} ${mapsText}<br/>
                    Tarih: ${resDateStr}<br/>
                    Saat: ${slot.time}<br/>
                    Kişi Sayısı: ${reservation.personCount}<br/>
                    <br/>
                    <p><b>Ayrıcalık Kullanımı:</b> PRIVON üyeliğinize ait ayrıcalıkları, hesap ödeme aşamasında restoran sistemine otomatik olarak yansıtılacaktır. Mekanda ek bir beyanda bulunmanıza gerek yoktur.</p>
                    <p><b>İptal ve Değişiklik Politikası:</b> Partner restoranlarımızın masa planlaması gereği, olası iptal ve değişiklik işlemlerinizi rezervasyon saatinize en geç 12 saat kalana kadar uygulama üzerinden gerçekleştirebilirsiniz.</p>
                    <p><i>(Not: Rezervasyon saatinize 12 saatten daha az bir süre kala oluşturduğunuz anlık rezervasyonlar, sistem tarafından doğrudan kesinleşmiş olarak kabul edilir ve değişikliğe kapalıdır.)</i></p>
                    <br/>
                    <p>İyi günler dileriz.</p>
                    <p>PRIVON</p>
                `;
      } else if (type === 'CANCEL') {
        pushTitle = 'Rezervasyon İptali';
        pushBody = `${restaurant.name} (${resDateStr}, ${slot.time}) rezervasyonunuz iptal edilmiştir.`;
        emailSubject = `Rezervasyon İptali: ${restaurant.name}, ${resDateStr} | PRIVON`;
        emailHtml = `
                    <p>Sayın ${fullUser.fullName},</p>
                    <p>${resDateStr}, saat ${slot.time} tarihli ${restaurant.name} (${reservation.personCount} Kişi) rezervasyonunuz talebiniz doğrultusunda iptal edilmiştir.</p>
                    <br/>
                    <p>İptal işleminiz sistemlerimize yansımış olup, partner restoranımıza gerekli bilgilendirme tarafımızca yapılmıştır. Gelecekteki gastronomi planlamalarınızda size yeniden ayrıcalıklı bir deneyim sunmaktan memnuniyet duyarız.</p>
                    <br/>
                    <p>PRIVON</p>
                `;
      } else if (type === 'REMINDER_24H') {
        pushTitle = 'PRIVON: Rezervasyon Hatırlatması';
        pushBody = `Yarın ${slot.time}'daki ${restaurant.name} rezervasyonunuzu hatırlatmak isteriz. Olası değişiklikleri uygulamanız üzerinden yönetebilirsiniz.`;
        // No email for reminders as per requirements
      } else if (type === 'REMINDER_4H') {
        pushTitle = 'PRIVON: Rezervasyon Hatırlatması';
        pushBody = `Bugün ${slot.time} ${restaurant.name} rezervasyonunuz için bekleniyorsunuz. Tüm detaylar ve ayrıcalıklarınız restoranın sistemine tanımlanmıştır.`;
        // No email for reminders as per requirements
      }

      // OneSignal Push Notification (Customer)
      if (fullUser._id && fullUser.notification?.app !== false) {
        await this.notificationService.sendNotification({
          userIds: [fullUser._id.toString()],
          title: pushTitle,
          body: pushBody,
          data: { type: `CUSTOMER_${type}`, reservationId: reservation._id },
        });
      }

      // Email Bildirimi (Customer)
      if (
        emailHtml &&
        fullUser.email &&
        fullUser.notification?.email !== false
      ) {
        await this.mailService.sendEmail({
          to: fullUser.email,
          subject: emailSubject,
          html: emailHtml,
          account: 'info',
        });
      }
    } catch (err) {
      console.error(`Error sending ${type} customer notification:`, err);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDelayedNotifications() {
    const now = new Date();

    // 1) PENDING ve zamanı gelmiş olan job'ları bul
    const pendingJobs = await this.delayedJobModel.find({
      status: DelayedNotificationJobStatus.PENDING,
      executeAt: { $lte: now },
    });

    if (pendingJobs.length === 0) {
      return;
    }

    console.log(
      `Cron: Processing ${pendingJobs.length} delayed notifications...`,
    );

    for (const job of pendingJobs) {
      try {
        // Her ihtimale karşı rezervasyon durumunu tekrar kontrol edelim
        const currentRes = await this.reservationModel.findById(
          job.reservation,
        );

        // Sadece veritabanında silinmişse veya iptal edilmişse atla (ve iptal et)
        if (
          !currentRes ||
          currentRes.status === ReservationStatus.CANCELLED ||
          currentRes.status === ReservationStatus.REJECTED
        ) {
          job.status = DelayedNotificationJobStatus.CANCELLED;
          await job.save();
          continue;
        }

        if (job.type === DelayedNotificationJobType.NEW_RESERVATION) {
          await this.sendRestaurantNotification(
            job.reservation.toString(),
            'NEW',
          );
        } else if (job.type === DelayedNotificationJobType.USER_REMINDER_24H) {
          await this.sendCustomerNotification(
            job.reservation.toString(),
            'REMINDER_24H',
          );
        } else if (job.type === DelayedNotificationJobType.USER_REMINDER_4H) {
          await this.sendCustomerNotification(
            job.reservation.toString(),
            'REMINDER_4H',
          );
        }

        // Başarılı olursa job'u tamamlandı olarak işaretle
        job.status = DelayedNotificationJobStatus.COMPLETED;
        await job.save();
      } catch (err) {
        console.error(`Cron: Error processing delayed job ${job._id}: `, err);
      }
    }
  }
}
