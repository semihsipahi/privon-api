import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UserService } from '../user/user.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RequiresOwnership } from 'src/common/decorators/requires-ownership.decorator';
import { ResourceOwnerGuard } from 'src/common/guards/resource-owner.guard';
import { OptionalJwtAuthGuard } from 'src/common/guards/optional-jwt-auth.guard';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateRestaurantDto } from 'src/dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dtos/update-restaurant.dto';
import { LocationQueryDto } from 'src/dtos/location-query.dto';
import { RestaurantListQueryDto } from 'src/dtos/restaurant-list-query.dto';

@ApiTags('Restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
    private readonly userService: UserService,
  ) { }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @ApiOperation({ summary: 'Restoranları listele (Refine uyumlu)' })
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
    return await this.restaurantService.list(query);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Restoranları listele (Özet bilgiler, filtreleme ile)',
  })
  async getPublicRestaurantsList(@Query() query: RestaurantListQueryDto) {
    return await this.restaurantService.getPublicRestaurantsList(query);
  }

  @Get('stats')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @ApiOperation({
    summary: 'Restoran istatistiklerini getir',
  })
  @ApiQuery({ name: 'restaurantId', required: false, description: 'Restoran ID (SuperAdmin için)' })
  @ApiQuery({ name: 'reservationDate', required: false, description: 'Günlük rezervasyon tarihi (YYYY-MM-DD)' })
  @ApiQuery({ name: 'salesDate', required: false, description: 'Aylık ciro ayı (YYYY-MM)' })
  async getStats(
    @Req() req: any,
    @Query('restaurantId') restaurantId?: string,
    @Query('reservationDate') reservationDate?: string,
    @Query('salesDate') salesDate?: string,
  ) {
    return await this.restaurantService.getStats(req.user.role === Role.SuperAdmin ? restaurantId : req.user.restaurantId, reservationDate, salesDate);
  }

  @Get('stats/categories')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Kategori istatistiklerini getir (Restoran sayıları)',
  })
  async getCategoryStats() {
    return await this.restaurantService.getCategoryStats();
  }

  @Get('public/:id')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Restoran detaylarını getir (Kuponlar ve Yorumlar ile)',
  })
  async getPublicRestaurant(
    @Param('id') id: string,
    @Query() locationQuery: LocationQueryDto,
    @Req() req: any,
  ) {
    return await this.restaurantService.getPublicRestaurantDetails(
      id,
      locationQuery.userLat,
      locationQuery.userLon,
      req.user?.userId,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @UseGuards(ResourceOwnerGuard)
  @RequiresOwnership({ modelName: 'Restaurant', ownerField: 'owner' })
  @ApiOperation({ summary: 'Tek bir restoran getir' })
  async getOne(@Param('id') id: string) {
    return await this.restaurantService.findByID(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary: 'Yeni bir restoran oluştur (Süper Admin)',
  })
  async create(@Body() createRestaurantDto: CreateRestaurantDto, @Req() req: any) {
    // Super Admin yeni kullanıcı oluşturarak restoran ekleyebilir
    if (!createRestaurantDto.owner && createRestaurantDto.phone) {
      const ownerResult = await this.userService.prepareRestaurantOwner({
        fullName: createRestaurantDto.ownerName || createRestaurantDto.name || 'Restoran Sahibi',
        email: createRestaurantDto.ownerEmail || createRestaurantDto.email,
        phoneNumber: createRestaurantDto.phone,
      });
      createRestaurantDto.owner = ownerResult.id;
    }

    if (!createRestaurantDto.phone && !createRestaurantDto.owner) {
      throw new BadRequestException('Telefon numarası veya sahibi belirtilmelidir');
    }

    return await this.restaurantService.create(createRestaurantDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @UseGuards(ResourceOwnerGuard)
  @RequiresOwnership({ modelName: 'Restaurant', ownerField: 'owner' })
  @ApiOperation({
    summary: 'Restoran güncelle (Restoran Sahibi ve Süper Admin)',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return await this.restaurantService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner)
  @UseGuards(ResourceOwnerGuard)
  @RequiresOwnership({ modelName: 'Restaurant', ownerField: 'owner' })
  @ApiOperation({ summary: 'Restoran sil (Restoran Sahibi ve Süper Admin)' })
  async delete(@Param('id') id: string) {
    return await this.restaurantService.delete(id);
  }

  @Post('favorite/:id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.RestaurantOwner, Role.SuperAdmin)
  @ApiOperation({ summary: 'Restoranı favorilere ekle' })
  async addFavorite(@Param('id') id: string, @Req() req: any) {
    return await this.userService.addFavoriteRestaurant(req.user.userId, id);
  }

  @Delete('favorite/:id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.RestaurantOwner, Role.SuperAdmin)
  @ApiOperation({ summary: 'Restoranı favorilerden çıkar' })
  async removeFavorite(@Param('id') id: string, @Req() req: any) {
    return await this.userService.removeFavoriteRestaurant(req.user.userId, id);
  }

  @Get('favorites/my')
  @ApiBearerAuth()
  @Roles(Role.User, Role.RestaurantOwner, Role.SuperAdmin)
  @ApiOperation({ summary: 'Favori restoranlarımı getir' })
  async getFavorites(@Req() req: any) {
    return await this.userService.getFavoriteRestaurants(req.user.userId);
  }
}
