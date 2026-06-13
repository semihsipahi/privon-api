import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TastingMenu } from '../../models/tasting-menu.schema';
import { CreateTastingMenuDto } from '../../dtos/create-tasting-menu.dto';
import { UpdateTastingMenuDto } from '../../dtos/update-tasting-menu.dto';

@Injectable()
export class TastingMenuService {
  constructor(
    @InjectModel(TastingMenu.name)
    private readonly model: Model<TastingMenu>,
  ) {}

  async create(dto: CreateTastingMenuDto): Promise<TastingMenu> {
    return this.model.create({
      ...dto,
      restaurantId: new Types.ObjectId(dto.restaurantId),
      courses: dto.courses ?? [],
      isActive: dto.isActive ?? true,
    });
  }

  async findLatest(limit = 5): Promise<any[]> {
    return this.model
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('restaurantId', 'name location rezervemSlug images')
      .lean();
  }

  async findByRestaurant(restaurantId: string): Promise<TastingMenu[]> {
    return this.model
      .find({ restaurantId: new Types.ObjectId(restaurantId), isActive: true })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name location rezervemSlug images')
      .lean();
  }

  async findById(id: string): Promise<any> {
    const menu = await this.model
      .findById(id)
      .populate('restaurantId', 'name location rezervemSlug images')
      .lean();
    if (!menu) throw new NotFoundException('Tadım menüsü bulunamadı');
    return menu;
  }

  async update(id: string, dto: UpdateTastingMenuDto): Promise<TastingMenu> {
    const menu = await this.model.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!menu) throw new NotFoundException('Tadım menüsü bulunamadı');
    return menu;
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Tadım menüsü bulunamadı');
  }

  async listAll(restaurantId?: string): Promise<TastingMenu[]> {
    const filter: any = {};
    if (restaurantId) filter.restaurantId = new Types.ObjectId(restaurantId);
    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name')
      .lean();
  }
}
