import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { RestaurantApplicationService, ApprovalResult } from './restaurant-application.service';
import { CreateApplicationDto, UpdateApplicationStatusDto } from '../../dtos';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Restaurant Applications')
@Controller('restaurant-applications')
export class RestaurantApplicationController {
    constructor(private readonly restaurantApplicationService: RestaurantApplicationService) { }

    @Public()
    @Post()
    @ApiOperation({ summary: 'Create a new restaurant application' })
    @ApiResponse({ status: 201, description: 'The application has been successfully created.' })
    create(@Body() createApplicationDto: CreateApplicationDto) {
        return this.restaurantApplicationService.create(createApplicationDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'List all restaurant applications' })
    @ApiResponse({ status: 200, description: 'Return all applications.' })
    findAll(@Query() query: any) {
        return this.restaurantApplicationService.list(query);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @ApiBearerAuth()
    @Get(':id')
    @ApiOperation({ summary: 'Get a restaurant application by ID' })
    @ApiResponse({ status: 200, description: 'Return the application.' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    findOne(@Param('id') id: string) {
        return this.restaurantApplicationService.findByID(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @ApiBearerAuth()
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update application status' })
    @ApiResponse({ status: 200, description: 'The application status has been successfully updated.' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['PENDING', 'APPROVED', 'REJECTED'],
                    example: 'APPROVED',
                },
            },
        },
    })
    updateStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdateApplicationStatusDto,
    ): Promise<ApprovalResult> {
        return this.restaurantApplicationService.updateStatus(id, updateStatusDto.status);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SuperAdmin)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a restaurant application' })
    @ApiResponse({ status: 200, description: 'The application has been successfully deleted.' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    delete(@Param('id') id: string) {
        return this.restaurantApplicationService.delete(id);
    }
}
