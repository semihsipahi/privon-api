import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Slot } from '../../models/slot.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateSlotDto } from 'src/dtos/create-slot.dto';
import { UpdateSlotDto } from 'src/dtos/update-slot.dto';
import { Role } from 'src/common/enums/role.enum';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Injectable()
export class SlotService extends ResourceService<Slot, CreateSlotDto, UpdateSlotDto> {
    constructor(
        @InjectModel(Slot.name)
        private slotModel: Model<Slot>,
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
            query.days = new Date(date).getDay();
        }

        if (personCount) {
            query.minPersons = { $lte: personCount };
            query.maxPersons = { $gte: personCount };
        }

        return await this.slotModel
            .find(query)
            .sort({ time: 1 })
            .lean()
            .exec();
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
