import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RestaurantApplicationService, ApprovalResult } from './restaurant-application.service';
import { CreateApplicationDto, UpdateApplicationStatusDto } from '../../dtos';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('restaurant-applications')
export class RestaurantApplicationController {
    constructor(private readonly restaurantApplicationService: RestaurantApplicationService) { }

    @Public()
    @Post()
    create(@Body() createApplicationDto: CreateApplicationDto) {
        return this.restaurantApplicationService.create(createApplicationDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @Get()
    findAll(@Query() query: any) {
        return this.restaurantApplicationService.list(query);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.restaurantApplicationService.findByID(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateApplicationStatusDto,
    ): Promise<ApprovalResult> {
        return this.restaurantApplicationService.updateStatus(id, updateStatusDto.status);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.restaurantApplicationService.delete(id);
    }
}
