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
import { CategoryService } from './category.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCategoryDto } from 'src/dtos/create-category.dto';
import { UpdateCategoryDto } from 'src/dtos/update-category.dto';
import { GetCategoriesDto } from 'src/dtos/get-categories.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Kategori oluştur (SuperAdmin)' })
    async create(@Body() createDto: CreateCategoryDto) {
        return await this.categoryService.create(createDto as any);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Kategorileri listele (Public)' })
    async list(@Query() query: GetCategoriesDto) {
        return await this.categoryService.list(query);
    }

    @Put(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Kategori güncelle (SuperAdmin)' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
        return await this.categoryService.update(id, updateDto as any);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Kategori sil (SuperAdmin)' })
    async delete(@Param('id') id: string) {
        return await this.categoryService.deleteCategory(id);
    }
}
