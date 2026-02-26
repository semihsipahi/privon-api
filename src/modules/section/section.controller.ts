import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { SectionService } from './section.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateSectionDto, UpdateSectionDto } from 'src/dtos';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Section')
@Controller('section')
export class SectionController {
    constructor(private readonly sectionService: SectionService) { }

    @Post()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Section oluştur (SuperAdmin)' })
    async create(@Body() createDto: CreateSectionDto) {
        return await this.sectionService.create(createDto as any);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Sectionları listele (Public)' })
    @ApiQuery({ name: 'type', required: false, description: 'Section tipi (örn: home)' })
    @ApiQuery({ name: '_sort', required: false, description: 'Sıralama (örn: order)' })
    @ApiQuery({ name: '_order', required: false, description: 'Sıralama (asc veya desc)' })
    @ApiQuery({ name: '_start', required: false, description: 'Başlangıç indeksi' })
    @ApiQuery({ name: '_end', required: false, description: 'Bitiş indeksi' })
    async list(@Query() query: any) {
        return await this.sectionService.list(query);
    }

    @Put(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Section güncelle (SuperAdmin)' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateSectionDto) {
        return await this.sectionService.update(id, updateDto as any);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Section sil (SuperAdmin)' })
    async delete(@Param('id') id: string) {
        return await this.sectionService.delete(id);
    }
}
