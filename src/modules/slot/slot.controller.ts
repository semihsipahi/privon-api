import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Delete,
  Put,
  Request,
} from '@nestjs/common';
import { SlotService } from './slot.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateSlotDto } from 'src/dtos/create-slot.dto';
import { UpdateSlotDto } from 'src/dtos/update-slot.dto';

@ApiTags('Slot')
@Controller('slot')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({ summary: 'Slotları listele (Refine uyumlu)' })
  @ApiQuery({
    name: '_start',
    required: false,
    description: 'Başlangıç index (0-tabanlı)',
  })
  @ApiQuery({
    name: '_end',
    required: false,
    description: 'Bitiş index (hariç)',
  })
  @ApiQuery({
    name: '_sort',
    required: false,
    description: 'Sıralama alanı',
  })
  @ApiQuery({
    name: '_order',
    required: false,
    description: 'Sıralama yönü (asc/desc)',
  })
  async list(@Query() query: any) {
    return await this.slotService.list(query);
  }

  @Get('restaurant/:restaurantId')
  @Public()
  @ApiOperation({ summary: 'Restorana ait slotları getir (filtreleme ile)' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Rezervasyon tarihi (YYYY-MM-DD)',
    example: '2025-12-25',
  })
  @ApiQuery({
    name: 'personCount',
    required: false,
    description: 'Kişi sayısı',
    example: 4,
  })
  async getByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
    @Query('personCount') personCount?: string,
  ) {
    return await this.slotService.findByRestaurantWithFilters(
      restaurantId,
      date,
      personCount ? parseInt(personCount, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({ summary: 'Tek bir slot getir' })
  async getOne(@Param('id') id: string) {
    return await this.slotService.findByID(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({ summary: 'Yeni slot oluştur (sadece kendi restoranı)' })
  async create(@Body() createSlotDto: CreateSlotDto, @Request() req: any) {
    return this.slotService.withOwnership(
      req.user,
      () => this.slotService.create(createSlotDto),
      createSlotDto.restaurant,
    );
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({ summary: 'Slot güncelle (sadece kendi restoranı)' })
  async update(
    @Param('id') id: string,
    @Body() updateSlotDto: UpdateSlotDto,
    @Request() req: any,
  ) {
    return this.slotService.withOwnership(
      req.user,
      () => this.slotService.update(id, updateSlotDto),
      undefined,
      id,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({ summary: 'Slot sil (sadece kendi restoranı)' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.slotService.withOwnership(
      req.user,
      () => this.slotService.delete(id),
      undefined,
      id,
    );
  }
}
