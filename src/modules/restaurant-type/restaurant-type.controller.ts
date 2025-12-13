import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { RestaurantTypeService } from './restaurant-type.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateRestaurantTypeDto } from 'src/dtos/create-restaurant-type.dto';
import { UpdateRestaurantTypeDto } from 'src/dtos/update-restaurant-type.dto';

@ApiTags('Restaurant Type')
@Controller('restaurant-type')
export class RestaurantTypeController {
  constructor(private readonly restaurantTypeService: RestaurantTypeService) {}

  /**
   * Refine getList endpoint
   * GET /restaurant-type?_start=0&_end=10&_sort=createdAt&_order=desc&name_like=türk
   * Response: { data: RestaurantType[], total: number }
   * Tüm kullanıcılar görüntüleyebilir
   */
  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({ summary: 'Restoran türlerini listele (Refine uyumlu)' })
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
    description: 'Sıralama alanı (örn: createdAt)',
  })
  @ApiQuery({
    name: '_order',
    required: false,
    description: 'Sıralama yönü (asc/desc)',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Genel arama' })
  async list(@Query() query: any) {
    return await this.restaurantTypeService.list(query);
  }

  /**
   * Refine getOne endpoint
   * GET /restaurant-type/:id
   * Tüm kullanıcılar görüntüleyebilir
   */
  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({ summary: 'Tek bir restoran türü getir' })
  async getOne(@Param('id') id: string) {
    return await this.restaurantTypeService.findByID(id);
  }

  /**
   * Refine create endpoint
   * POST /restaurant-type
   * Sadece süper admin oluşturabilir
   */
  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Yeni bir restoran türü oluştur (Sadece Süper Admin)',
  })
  async create(@Body() createRestaurantTypeDto: CreateRestaurantTypeDto) {
    return await this.restaurantTypeService.create(createRestaurantTypeDto);
  }

  /**
   * Refine update endpoint
   * PATCH /restaurant-type/:id
   * Sadece süper admin güncelleyebilir
   */
  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Restoran türü güncelle (Sadece Süper Admin)' })
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantTypeDto: UpdateRestaurantTypeDto,
  ) {
    return await this.restaurantTypeService.update(id, updateRestaurantTypeDto);
  }

  /**
   * Refine delete endpoint
   * DELETE /restaurant-type/:id
   * Sadece süper admin silebilir
   * Default kategori silinemez, diğer kategoriler silinirken restoranlar "Genel" kategorisine taşınır
   */
  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Restoran türü sil (Sadece Süper Admin)' })
  async delete(@Param('id') id: string) {
    return await this.restaurantTypeService.deleteRestaurantType(id);
  }
}
