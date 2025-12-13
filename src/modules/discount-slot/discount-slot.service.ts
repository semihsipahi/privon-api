import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    DiscountSchedule,
    DiscountSlot,
} from '../../models/discount-schedule.schema';
import {
    SlotReservation,
} from '../../models/slot-reservation.schema';
import { ReservationStatus } from '../../common/enums/discount.enum';
import { Restaurant } from '../../models/restaurant.schema';
import { User } from '../../models/user.schema';
import { CreateDiscountScheduleDto } from '../../dtos/create-discount-schedule.dto';
import { UpdateDiscountScheduleDto }
    from '../../dtos/update-discount-schedule.dto';
import { ClaimSlotDto } from '../../dtos/claim-slot.dto';
import { DayOfWeek } from '../../common/enums/discount.enum';

@Injectable()
export class DiscountSlotService {
    constructor(
        @InjectModel(DiscountSchedule.name)
        private scheduleModel: Model<DiscountSchedule>,
        @InjectModel(SlotReservation.name)
        private reservationModel: Model<SlotReservation>,
        @InjectModel(Restaurant.name)
        private restaurantModel: Model<Restaurant>,
        @InjectModel(User.name)
        private userModel: Model<User>,
    ) { }

    // ==================== SCHEDULE CRUD ====================

    async create(dto: CreateDiscountScheduleDto, restaurantId: string): Promise<DiscountSchedule> {
        // Slotları otomatik oluştur
        const slots = this.generateSlots(
            dto.startTime,
            dto.endTime,
            dto.slotDurationMinutes || 30,
            dto.tablesPerSlot,
            dto.minGuests,
            dto.maxGuests,
            dto.discountPercentage,
        );

        const schedule = new this.scheduleModel({
            ...dto,
            restaurant: restaurantId,
            slots,
        });

        return schedule.save();
    }

    async findAll(restaurantId?: string, _start: number = 0, _end: number = 10) {
        const filter = restaurantId ? { restaurant: restaurantId } : {};
        const start = Number(_start) || 0;
        const end = Number(_end) || start + 10;
        const limit = end - start;

        const [total, data] = await Promise.all([
            this.scheduleModel.countDocuments(filter),
            this.scheduleModel
                .find(filter)
                .skip(start)
                .limit(limit)
                .exec(),
        ]);

        return { data, total };
    }

    async findOne(id: string): Promise<DiscountSchedule> {
        const schedule = await this.scheduleModel.findById(id);
        if (!schedule) {
            throw new NotFoundException('İndirim programı bulunamadı');
        }
        return schedule;
    }

    async update(
        id: string,
        dto: UpdateDiscountScheduleDto,
    ): Promise<DiscountSchedule> {
        // Eğer zaman bilgileri değiştiyse slotları yeniden oluştur
        const existingSchedule = await this.findOne(id);

        let slots = existingSchedule.slots;
        if (
            dto.startTime ||
            dto.endTime ||
            dto.slotDurationMinutes ||
            dto.tablesPerSlot ||
            dto.minGuests ||
            dto.maxGuests ||
            dto.discountPercentage
        ) {
            slots = this.generateSlots(
                dto.startTime || existingSchedule.startTime,
                dto.endTime || existingSchedule.endTime,
                dto.slotDurationMinutes || existingSchedule.slotDurationMinutes,
                dto.tablesPerSlot || existingSchedule.tablesPerSlot,
                dto.minGuests || existingSchedule.minGuests,
                dto.maxGuests || existingSchedule.maxGuests,
                dto.discountPercentage || existingSchedule.discountPercentage,
            );
        }

        const updated = await this.scheduleModel.findByIdAndUpdate(
            id,
            { ...dto, slots },
            { new: true },
        );

        if (!updated) {
            throw new NotFoundException('İndirim programı bulunamadı');
        }

        return updated;
    }

    async delete(id: string): Promise<void> {
        const result = await this.scheduleModel.findByIdAndDelete(id);
        if (!result) {
            throw new NotFoundException('İndirim programı bulunamadı');
        }
    }

    // ==================== SLOT CLAIM / VALIDATE ====================

    async claimSlot(userId: string, dto: ClaimSlotDto) {
        const schedule = await this.scheduleModel.findById(dto.scheduleId);
        if (!schedule) {
            throw new NotFoundException('İndirim programı bulunamadı');
        }

        if (!schedule.isActive) {
            throw new BadRequestException('Bu indirim programı aktif değil');
        }

        if (schedule.restaurant.toString() !== dto.restaurantId) {
            throw new BadRequestException(
                'Bu indirim programı bu restoran için geçerli değil',
            );
        }

        // Gün kontrolü
        const reservationDate = new Date(dto.reservationDate);
        const dayOfWeek = this.getDayOfWeek(reservationDate);
        if (!schedule.activeDays.includes(dayOfWeek)) {
            throw new BadRequestException(
                'Bu gün için indirim programı aktif değil',
            );
        }

        // Slot kontrolü
        const slot = schedule.slots.find(
            (s) => s.startTime === dto.slotStartTime,
        );
        if (!slot) {
            throw new BadRequestException('Geçersiz slot saati');
        }

        // Kişi sayısı kontrolü
        if (dto.guestCount < slot.minGuests || dto.guestCount > slot.maxGuests) {
            throw new BadRequestException(
                `Kişi sayısı ${slot.minGuests} ile ${slot.maxGuests} arasında olmalıdır`,
            );
        }

        // Aynı slotta müsait masa var mı kontrolü
        const existingReservations = await this.reservationModel.countDocuments({
            schedule: dto.scheduleId,
            reservationDate: {
                $gte: new Date(reservationDate.setHours(0, 0, 0, 0)),
                $lt: new Date(reservationDate.setHours(23, 59, 59, 999)),
            },
            slotStartTime: dto.slotStartTime,
            status: { $in: [ReservationStatus.CLAIMED] },
        });

        if (existingReservations >= slot.availableTables) {
            throw new ConflictException(
                'Bu slot için müsait masa kalmadı. Lütfen başka bir slot seçin.',
            );
        }

        // Benzersiz rezervasyon kodu oluştur
        let reservationCode = this.generateReservationCode();
        let exists = await this.reservationModel.findOne({ reservationCode });
        while (exists) {
            reservationCode = this.generateReservationCode();
            exists = await this.reservationModel.findOne({ reservationCode });
        }

        // Rezervasyon geçerlilik süresi: slot başlangıcından 30 dakika sonrasına kadar
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        const expiresAt = new Date(dto.reservationDate);
        expiresAt.setHours(hours, minutes + 30, 0, 0);

        const reservation = await this.reservationModel.create({
            schedule: dto.scheduleId,
            user: userId,
            restaurant: dto.restaurantId,
            reservationDate: new Date(dto.reservationDate),
            slotStartTime: slot.startTime,
            slotEndTime: slot.endTime,
            guestCount: dto.guestCount,
            reservationCode,
            discountPercentage: slot.discountPercentage,
            status: ReservationStatus.CLAIMED,
            expiresAt,
        });

        return {
            reservation,
            reservationCode,
            qrCode: reservationCode,
            slotTime: `${slot.startTime} - ${slot.endTime}`,
            discountPercentage: slot.discountPercentage,
            expiresAt,
        };
    }

    async validateSlot(
        reservationCode: string,
        orderAmount: number,
        ownerId: string,
    ) {
        const restaurantId = await this.getRestaurantByOwnerId(ownerId);

        const reservation = await this.reservationModel
            .findOne({ reservationCode })
            .populate('schedule');

        if (!reservation) {
            throw new NotFoundException('Rezervasyon kodu bulunamadı');
        }

        if (reservation.status !== ReservationStatus.CLAIMED) {
            throw new BadRequestException(
                'Rezervasyon zaten kullanılmış veya geçersiz',
            );
        }

        if (new Date() > reservation.expiresAt) {
            reservation.status = ReservationStatus.EXPIRED;
            await reservation.save();
            throw new BadRequestException('Rezervasyon süresi dolmuş');
        }

        if (reservation.restaurant.toString() !== restaurantId) {
            throw new BadRequestException(
                'Bu rezervasyon bu restoran için geçerli değil',
            );
        }

        // İndirim hesaplama
        const discountPercentage = reservation.discountPercentage || 0;
        const discountAmount = (orderAmount * discountPercentage) / 100;
        const finalAmount = Math.max(0, orderAmount - discountAmount);

        // Rezervasyonu güncelle
        reservation.status = ReservationStatus.VALIDATED;
        reservation.orderAmount = orderAmount;
        reservation.discountAmount = discountAmount;
        reservation.finalAmount = finalAmount;
        reservation.validatedAt = new Date();
        await reservation.save();

        return {
            success: true,
            orderAmount,
            discountPercentage,
            discountAmount,
            finalAmount,
            savings: discountAmount,
        };
    }

    // ==================== QUERY METHODS ====================

    async getAvailableSlots(restaurantId: string, date: string) {
        const targetDate = new Date(date);
        const dayOfWeek = this.getDayOfWeek(targetDate);

        const schedules = await this.scheduleModel.find({
            restaurant: restaurantId,
            isActive: true,
            activeDays: dayOfWeek,
        });

        const availableSlots = [];

        for (const schedule of schedules) {
            for (const slot of schedule.slots) {
                // Bu slot için kaç rezervasyon var?
                const reservationCount = await this.reservationModel.countDocuments({
                    schedule: schedule._id,
                    reservationDate: {
                        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(targetDate.setHours(23, 59, 59, 999)),
                    },
                    slotStartTime: slot.startTime,
                    status: { $in: [ReservationStatus.CLAIMED] },
                });

                const availableTables = slot.availableTables - reservationCount;

                availableSlots.push({
                    scheduleId: schedule._id,
                    slotStartTime: slot.startTime,
                    slotEndTime: slot.endTime,
                    availableTables: Math.max(0, availableTables),
                    totalTables: slot.availableTables,
                    minGuests: slot.minGuests,
                    maxGuests: slot.maxGuests,
                    discountPercentage: slot.discountPercentage,
                    isAvailable: availableTables > 0,
                });
            }
        }

        return availableSlots;
    }

    async getUserReservations(userId: string, _start = 0, _end = 10) {
        const start = Number(_start) || 0;
        const end = Number(_end) || start + 10;
        const limit = end - start;

        // Toplam kazanç hesaplama
        const totalSavingsResult = await this.reservationModel.aggregate([
            {
                $match: {
                    user: userId,
                    status: ReservationStatus.VALIDATED,
                },
            },
            {
                $group: {
                    _id: null,
                    totalSavings: { $sum: '$discountAmount' },
                },
            },
        ]);

        const totalSavings = totalSavingsResult[0]?.totalSavings || 0;

        const [total, totalUsed, totalClaimed] = await Promise.all([
            this.reservationModel.countDocuments({ user: userId }),
            this.reservationModel.countDocuments({
                user: userId,
                status: ReservationStatus.VALIDATED,
            }),
            this.reservationModel.countDocuments({
                user: userId,
                status: ReservationStatus.CLAIMED,
            }),
        ]);

        const reservations = await this.reservationModel
            .find({ user: userId })
            .populate('schedule')
            .sort({ createdAt: -1 })
            .skip(start)
            .limit(limit)
            .lean();

        const detailedReservations = reservations.map((r: any) => ({
            _id: r._id,
            scheduleId: r.schedule?._id,
            restaurantName: r.restaurant?.name || 'Bilinmeyen İşletme',
            reservationDate: r.reservationDate,
            slotTime: `${r.slotStartTime} - ${r.slotEndTime}`,
            guestCount: r.guestCount,
            discountPercentage: r.discountPercentage,
            discountAmount: r.discountAmount || 0,
            orderAmount: r.orderAmount || 0,
            finalAmount: r.finalAmount || 0,
            savings: r.discountAmount || 0,
            status: r.status,
            reservationCode: r.reservationCode,
            date: r.validatedAt || r.createdAt,
        }));

        return {
            data: detailedReservations,
            total,
            summary: {
                totalSavings,
                totalUsed,
                totalClaimed,
            },
        };
    }

    // ==================== HELPER METHODS ====================

    private generateSlots(
        startTime: string,
        endTime: string,
        durationMinutes: number,
        tablesPerSlot: number,
        minGuests: number,
        maxGuests: number,
        discountPercentage: number,
    ): DiscountSlot[] {
        const slots: DiscountSlot[] = [];
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes + durationMinutes <= endMinutes) {
            const slotStartHour = Math.floor(currentMinutes / 60);
            const slotStartMin = currentMinutes % 60;
            const slotEndMinutes = currentMinutes + durationMinutes;
            const slotEndHour = Math.floor(slotEndMinutes / 60);
            const slotEndMin = slotEndMinutes % 60;

            slots.push({
                startTime: `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`,
                endTime: `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`,
                availableTables: tablesPerSlot,
                minGuests,
                maxGuests,
                discountPercentage,
            });

            currentMinutes += durationMinutes;
        }

        return slots;
    }

    private generateReservationCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    private getDayOfWeek(date: Date): DayOfWeek {
        const days: DayOfWeek[] = [
            DayOfWeek.SUNDAY,
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
            DayOfWeek.SATURDAY,
        ];
        return days[date.getDay()];
    }

    private async getRestaurantByOwnerId(ownerId: string): Promise<string> {
        const restaurant = await this.restaurantModel
            .findOne({ owner: ownerId })
            .select('_id');

        if (!restaurant) {
            throw new NotFoundException('Kullanıcıya ait restoran bulunamadı');
        }

        return restaurant._id.toString();
    }

    // ==================== RESTAURANT OWNER - DISCOUNT USAGES ====================

    async getRestaurantDiscountUsages(
        restaurantId: string,
        _start = 0,
        _end = 10,
        status?: ReservationStatus,
    ) {
        const start = Number(_start) || 0;
        const end = Number(_end) || start + 10;
        const limit = end - start;

        const filter: any = {
            restaurant: restaurantId,
            status: ReservationStatus.VALIDATED,  // Sadece kullanılmış indirimleri göster
        };

        // Opsiyonel status filtresi
        if (status) {
            filter.status = status;
        }

        // Toplam istatistikleri hesapla
        const statsResult = await this.reservationModel.aggregate([
            { $match: { restaurant: restaurantId, status: ReservationStatus.VALIDATED } },
            {
                $group: {
                    _id: null,
                    totalOrderAmount: { $sum: '$orderAmount' },
                    totalDiscountGiven: { $sum: '$discountAmount' },
                    totalEarnings: { $sum: '$finalAmount' },
                    totalUsageCount: { $sum: 1 },
                },
            },
        ]);

        const stats = statsResult[0] || {
            totalOrderAmount: 0,
            totalDiscountGiven: 0,
            totalEarnings: 0,
            totalUsageCount: 0,
        };

        // Toplam kayıt sayısı
        const total = await this.reservationModel.countDocuments(filter);

        // Rezervasyonları getir ve kullanıcı bilgilerini populate et
        const reservations = await this.reservationModel
            .find(filter)
            .populate('user', 'maskedName')
            .sort({ validatedAt: -1, createdAt: -1 })
            .skip(start)
            .limit(limit)
            .lean();

        // Detaylı veri formatla
        const usages = reservations.map((r: any) => ({
            _id: r._id,
            maskedUserName: r.user?.maskedName || 'Bilinmeyen Kullanıcı',
            reservationDate: r.reservationDate,
            slotTime: `${r.slotStartTime} - ${r.slotEndTime}`,
            guestCount: r.guestCount,
            discountPercentage: r.discountPercentage || 0,
            orderAmount: r.orderAmount || 0,
            discountAmount: r.discountAmount || 0,
            finalAmount: r.finalAmount || 0,  // İşletmenin kazancı
            validatedAt: r.validatedAt,
            status: r.status,
        }));

        return {
            data: usages,
            total,
            summary: {
                totalOrderAmount: stats.totalOrderAmount,
                totalDiscountGiven: stats.totalDiscountGiven,
                totalEarnings: stats.totalEarnings,
                totalUsageCount: stats.totalUsageCount,
            },
        };
    }
}
