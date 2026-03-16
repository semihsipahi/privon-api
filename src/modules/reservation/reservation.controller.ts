import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Put,
    Delete,
    Request,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { CreateReservationDto } from 'src/dtos/create-reservation.dto';
import { UpdateReservationStatusDto } from 'src/dtos/update-reservation-status.dto';
import { RequiresOwnership } from 'src/common/decorators/requires-ownership.decorator';
import { ResourceOwnerGuard } from 'src/common/guards/resource-owner.guard';
import { BulkCancelReservationDto } from 'src/dtos/bulk-cancel-reservation.dto';

@ApiTags('Reservation')
@Controller('reservation')
@ApiBearerAuth()
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }

    @Post()
    @Roles(Role.User)
    @ApiOperation({ summary: 'Rezervasyon yap' })
    async create(@Body() createDto: CreateReservationDto, @Request() req: any) {
        return await this.reservationService.createReservation(createDto, req.user);
    }

    @Get('my')
    @Roles(Role.User)
    @ApiOperation({ summary: 'Kendi rezervasyonlarım' })
    async getMyReservations(@Request() req: any) {
        return await this.reservationService.getMyReservations(req.user);
    }

    @Get('my-savings')
    @Roles(Role.User)
    @ApiOperation({
        summary: 'Kazanç özeti (Cebinde Kalan)',
        description: 'Kullanıcının tamamlanmış rezervasyonlardan elde ettiği toplam tasarrufu ve detayları döner.',
    })
    async getMySavings(@Request() req: any) {
        return await this.reservationService.getUserSavings(req.user.userId);
    }

    @Get('restaurant/:id')
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @UseGuards(ResourceOwnerGuard)
    @RequiresOwnership({ modelName: 'Restaurant', ownerField: 'owner' })
    @ApiOperation({ summary: 'Restorana ait rezervasyonlar' })
    async getRestaurantReservations(@Param('id') id: string) {
        return await this.reservationService.getRestaurantReservations(id);
    }

    @Get()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Tüm rezervasyonları listele (Refine)' })
    async list(@Query() query: any) {
        // Default sort to date: desc if not provided
        if (!query._sort) {
            query._sort = 'date';
            query._order = 'desc';
        }
        return await this.reservationService.list(query, null, [
            'customer',
            'restaurant',
            'slot',
            'cancelledBy',
        ]);
    }

    @Get('report/completed')
    @Roles(Role.SuperAdmin)
    @ApiOperation({
        summary: 'Tamamlanmış rezervasyon raporu (SuperAdmin)',
        description: 'Tamamlanmış rezervasyonları paginasyonlu listeler. Kullanıcı adı, indirim %, kazanç, restoran adı ve tarih bilgileri döner.',
    })
    @ApiQuery({ name: '_start', required: false, description: 'Başlangıç index (default: 0)' })
    @ApiQuery({ name: '_end', required: false, description: 'Bitiş index (default: 10)' })
    @ApiQuery({ name: '_sort', required: false, description: 'Sıralama alanı (default: date)' })
    @ApiQuery({ name: '_order', required: false, description: 'Sıralama yönü: asc/desc (default: desc)' })
    @ApiQuery({ name: 'restaurantId', required: false, description: 'Restoran ID ile filtrele' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Başlangıç tarihi (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'Bitiş tarihi (YYYY-MM-DD)' })
    @ApiQuery({ name: 'customerName', required: false, description: 'Müşteri adı ile filtrele' })
    async getCompletedReport(@Query() query: any) {
        return await this.reservationService.getCompletedReservationsReport(query);
    }

    @Get('user-summary/:userId')
    @Roles(Role.SuperAdmin)
    @ApiOperation({
        summary: 'Kullanıcı rezervasyon özeti (SuperAdmin)',
        description: 'Belirli bir kullanıcının tüm rezervasyon geçmişini ve finansal istatistiklerini (toplam harcama, tasarruf vb.) döner.',
    })
    @ApiQuery({ name: '_start', required: false, description: 'Geçmiş için başlangıç index' })
    @ApiQuery({ name: '_end', required: false, description: 'Geçmiş için bitiş index' })
    async getUserSummary(@Param('userId') userId: string, @Query() query: any) {
        return await this.reservationService.getUserReservationSummary(userId, query);
    }

    @Put(':id/status')
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'Rezervasyon durumu güncelle' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['pending', 'confirmed', 'seated', 'no_show', 'cancelled', 'rejected', 'completed'],
                    example: 'completed',
                },
                totalAmount: {
                    type: 'number',
                    example: 1000,
                },
                nonDiscountedAmount: {
                    type: 'number',
                    example: 200,
                },
            },
        },
    })
    async updateStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateReservationStatusDto,
        @Request() req: any,
    ) {
        return await this.reservationService.updateStatus(id, updateDto, req.user);
    }

    @Delete(':id')
    @Roles(Role.User)
    @ApiOperation({ summary: 'Rezervasyon iptal et' })
    async cancel(@Param('id') id: string, @Request() req: any) {
        return await this.reservationService.cancelReservation(id, req.user);
    }

    @Post('bulk-cancel')
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({
        summary: 'Toplu rezervasyon iptal et',
        description: 'Belirli bir tarihteki tüm rezervasyonları iptal eder.',
    })
    async bulkCancel(
        @Body() bulkCancelDto: BulkCancelReservationDto,
        @Request() req: any,
    ) {
        return await this.reservationService.bulkCancelReservations(
            bulkCancelDto,
            req.user,
        );
    }
}
