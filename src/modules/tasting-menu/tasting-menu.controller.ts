import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { TastingMenuService } from './tasting-menu.service';
import { CreateTastingMenuDto } from '../../dtos/create-tasting-menu.dto';
import { UpdateTastingMenuDto } from '../../dtos/update-tasting-menu.dto';

@ApiTags('Tasting Menu')
@Controller('tasting-menus')
export class TastingMenuController {
  constructor(private readonly service: TastingMenuService) {}

  // ── Public endpoints ──────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'Son N aktif tadım menüsü (ana ekran için)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiQuery({ name: 'restaurantId', required: false, type: String })
  findLatest(
    @Query('limit') limit?: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    if (restaurantId) return this.service.findByRestaurant(restaurantId);
    return this.service.findLatest(limit ? parseInt(limit, 10) : 5);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Tadım menüsü detayı' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ── Admin endpoints ───────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tadım menüsü oluştur (SuperAdmin)' })
  create(@Body() dto: CreateTastingMenuDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tadım menüsü güncelle (SuperAdmin)' })
  update(@Param('id') id: string, @Body() dto: UpdateTastingMenuDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tadım menüsü sil (SuperAdmin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tüm tadım menüleri (admin liste)' })
  @ApiQuery({ name: 'restaurantId', required: false })
  listAll(@Query('restaurantId') restaurantId?: string) {
    return this.service.listAll(restaurantId);
  }
}
