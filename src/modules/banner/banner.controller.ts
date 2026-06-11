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
import { BannerService } from './banner.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateBannerDto } from 'src/dtos/create-banner.dto';
import { UpdateBannerDto } from 'src/dtos/update-banner.dto';

@ApiTags('Banner')
@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // ============= PUBLIC ENDPOINT =============

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Mobil için aktif bannerları getir (sıralı)' })
  async getPublicBanners() {
    return await this.bannerService.getPublicBanners();
  }

  // ============= ADMIN ONLY ENDPOINTS =============

  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tüm bannerları listele (Sadece Admin)' })
  @ApiQuery({ name: '_start', required: false, description: 'Başlangıç index' })
  @ApiQuery({ name: '_end', required: false, description: 'Bitiş index' })
  @ApiQuery({ name: '_sort', required: false, description: 'Sıralama alanı' })
  @ApiQuery({
    name: '_order',
    required: false,
    description: 'Sıralama yönü (asc/desc)',
  })
  async list(@Query() query: any) {
    return await this.bannerService.list(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tek bir banner getir (Sadece Admin)' })
  async getOne(@Param('id') id: string) {
    return await this.bannerService.findByID(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Yeni banner oluştur (Sadece Admin)' })
  async create(@Body() createBannerDto: CreateBannerDto) {
    return await this.bannerService.create(createBannerDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Banner güncelle (Sadece Admin)' })
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return await this.bannerService.update(id, updateBannerDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Banner sil (Sadece Admin)' })
  async delete(@Param('id') id: string) {
    return await this.bannerService.delete(id);
  }
}
