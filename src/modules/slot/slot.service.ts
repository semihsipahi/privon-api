import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Slot } from '../../models/slot.schema';
import { Reservation } from '../../models/reservation.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateSlotDto } from 'src/dtos/create-slot.dto';
import { UpdateSlotDto } from 'src/dtos/update-slot.dto';
import { Role } from 'src/common/enums/role.enum';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { ReservationStatus } from 'src/common/enums/reservation-status.enum';

@Injectable()
export class SlotService extends ResourceService<Slot, CreateSlotDto, UpdateSlotDto> {
    constructor(
        @InjectModel(Slot.name)
        private slotModel: Model<Slot>,
        @InjectModel(Reservation.name)
        private reservationModel: Model<Reservation>,
    ) {
        super(slotModel);
    }

    async findByRestaurant(restaurantId: string) {
        return await this.slotModel
            .find({ restaurant: new Types.ObjectId(restaurantId) })
            .sort({ time: 1 })
            .lean()
            .exec();
    }

    async findByRestaurantWithFilters(
        restaurantId: string,
        date?: string,
        personCount?: number,
    ) {
        const query: any = { restaurant: new Types.ObjectId(restaurantId) };

        if (date) {
            const dateObj = new Date(date);
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0=Monday, 6=Sunday

            query.$or = [
                // Belirli tarihe özgü slotlar
                {
                    specificDate: {
                        $gte: startOfDay,
                        $lt: endOfDay,
                    },
                },
                // Haftalık tekrarlanan slotlar (specificDate yok veya null)
                {
                    specificDate: { $exists: false },
                    days: dayOfWeek,
                },
                {
                    specificDate: null,
                    days: dayOfWeek,
                },
            ];
        }

        if (personCount) {
            query.minPersons = { $lte: personCount };
            query.maxPersons = { $gte: personCount };
        }

        const slots = await this.slotModel
            .find(query)
            .sort({ time: 1 })
            .lean()
            .exec();

        // Eğer tarih varsa, her slot için müsait masa sayısını hesapla
        if (date) {
            const slotIds = slots.map((s) => s._id);

            // Aktif rezervasyonları say (iptal edilmemiş ve no_show olmayan)
            const activeStatuses = [
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
                ReservationStatus.SEATED,
                ReservationStatus.COMPLETED,
            ];

            const reservationCounts = await this.reservationModel.aggregate([
                {
                    $match: {
                        slot: { $in: slotIds },
                        date: date,
                        status: { $in: activeStatuses },
                    },
                },
                {
                    $group: {
                        _id: '$slot',
                        count: { $sum: 1 },
                    },
                },
            ]);

            // Rezervasyon sayılarını map'e çevir
            const countMap = new Map(
                reservationCounts.map((r) => [r._id.toString(), r.count]),
            );

            // Her slot için availableTables hesapla
            return slots.map((slot) => ({
                ...slot,
                reservedTables: countMap.get(slot._id.toString()) || 0,
                availableTables:
                    slot.tableQuota - (countMap.get(slot._id.toString()) || 0),
            }));
        }

        return slots;
    }

    private async validateOwnership(
        user: AuthUser,
        restaurantId?: string,
        slotId?: string,
    ): Promise<void> {
        if (user.role === Role.SuperAdmin) return;

        if (!user.restaurantId) {
            throw new ForbiddenException('Bu işlem için bir restorana sahip olmalısınız');
        }

        if (restaurantId) {
            if (user.restaurantId !== restaurantId) {
                throw new ForbiddenException('Sadece kendi restoranınız için slot oluşturabilirsiniz');
            }
            return;
        }

        if (slotId) {
            const slot = await this.slotModel.findById(slotId).select('restaurant').lean().exec();
            if (!slot) {
                throw new NotFoundException('Slot bulunamadı');
            }
            if (slot.restaurant.toString() !== user.restaurantId) {
                throw new ForbiddenException('Bu slot üzerinde işlem yetkiniz yok');
            }
        }
    }

    async withOwnership<T>(
        user: AuthUser,
        operation: () => Promise<T>,
        restaurantId?: string,
        slotId?: string,
    ): Promise<T> {
        await this.validateOwnership(user, restaurantId, slotId);
        return operation();
    }
}
