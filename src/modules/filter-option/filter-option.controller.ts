import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { FilterOptionService } from './filter-option.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFilterOptionDto } from 'src/dtos/create-filter-option.dto';
import { UpdateFilterOptionDto } from 'src/dtos/update-filter-option.dto';

@ApiTags('FilterOption')
@Controller('filter-option')
export class FilterOptionController {
  constructor(private readonly filterOptionService: FilterOptionService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Filtre seçeneği oluştur (SuperAdmin)' })
  async create(@Body() dto: CreateFilterOptionDto) {
    return this.filterOptionService.create(dto as any);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Filtre seçeneklerini listele — admin (tüm, paginated)' })
  async list(@Query() query: any) {
    return this.filterOptionService.list(query);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Aktif filtre seçeneklerini getir — gruplu (cuisine/atmosphere)' })
  async getPublic() {
    return this.filterOptionService.getGroupedOptions();
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Filtre seçeneği güncelle (SuperAdmin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateFilterOptionDto) {
    return this.filterOptionService.update(id, dto as any);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Filtre seçeneği sil (SuperAdmin)' })
  async delete(@Param('id') id: string) {
    return this.filterOptionService.delete(id);
  }
}
