import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
} from '@nestjs/common';
import { CityService } from './city.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCityDto } from 'src/dtos/create-city.dto';
import { UpdateCityDto } from 'src/dtos/update-city.dto';

@ApiTags('City')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Şehirleri getir (public)' })
  @ApiQuery({ name: 'isCapital', required: false, type: Boolean })
  @ApiQuery({ name: 'isDestination', required: false, type: Boolean })
  async list(@Query() query: { isCapital?: string; isDestination?: string }) {
    const params: { isCapital?: boolean; isDestination?: boolean } = {};
    if (query.isCapital !== undefined)
      params.isCapital = query.isCapital === 'true';
    if (query.isDestination !== undefined)
      params.isDestination = query.isDestination === 'true';
    return this.cityService.getCities(params);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Tek şehir getir (Admin)' })
  async getOne(@Param('id') id: string) {
    return await this.cityService.findByID(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Yeni şehir oluştur (Admin)' })
  async create(@Body() dto: CreateCityDto) {
    return await this.cityService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Şehir güncelle (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return await this.cityService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Şehir sil (Admin)' })
  async delete(@Param('id') id: string) {
    return await this.cityService.delete(id);
  }
}
