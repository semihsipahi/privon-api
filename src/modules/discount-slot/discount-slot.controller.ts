import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Param,
    Delete,
    Patch,
    Req,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DiscountSlotService } from './discount-slot.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import { CreateDiscountScheduleDto } from 'src/dtos/create-discount-schedule.dto';
import { UpdateDiscountScheduleDto } from 'src/dtos/update-discount-schedule.dto';
import { ClaimSlotDto } from 'src/dtos/claim-slot.dto';
import { ValidateSlotDto } from 'src/dtos/validate-slot.dto';

@ApiTags('Discount Slots')
@Controller('discount-slots')
export class DiscountSlotController {
    constructor(private readonly discountSlotService: DiscountSlotService) { }

    @Get()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'İndirim programlarını listele' })
    @ApiQuery({
        name: '_start',
        required: false,
        description: 'Başlangıç index (varsayılan: 0)',
    })
    @ApiQuery({
        name: '_end',
        required: false,
        description: 'Bitiş index (varsayılan: 10)',
    })
    async list(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
        @Query('restaurantId') restaurantId?: string,
        @Query('_start') _start?: number,
        @Query('_end') _end?: number,
    ) {
        try {
            let filterRestaurantId = restaurantId;

            if (req.user?.role === Role.RestaurantOwner) {
                filterRestaurantId = req.user.restaurantId;
            }

            const { data, total } = await this.discountSlotService.findAll(
                filterRestaurantId,
                _start,
                _end,
            );

            res.header('X-Total-Count', total.toString());
            res.header('Access-Control-Expose-Headers', 'X-Total-Count');

            return data;
        } catch (error) {
            console.error('List Error:', error);
            throw error;
        }
    }

    @Get('available')
    @ApiBearerAuth()
    @Roles(Role.User, Role.SuperAdmin)
    @ApiOperation({ summary: 'Müsait slotları getir' })
    @ApiQuery({ name: 'restaurantId', required: true, description: 'Restoran ID' })
    @ApiQuery({
        name: 'date',
        required: true,
        description: 'Tarih (YYYY-MM-DD)',
    })
    async getAvailableSlots(
        @Query('restaurantId') restaurantId: string,
        @Query('date') date: string,
    ) {
        return await this.discountSlotService.getAvailableSlots(restaurantId, date);
    }

    @Get('discount-usages')
    @ApiBearerAuth()
    @Roles(Role.RestaurantOwner, Role.SuperAdmin)
    @ApiOperation({ summary: 'Restoran indirim kullanımlarını listele' })
    @ApiQuery({
        name: '_start',
        required: false,
        description: 'Başlangıç index (varsayılan: 0)',
    })
    @ApiQuery({
        name: '_end',
        required: false,
        description: 'Bitiş index (varsayılan: 10)',
    })
    async getDiscountUsages(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
        @Query('_start') _start?: number,
        @Query('_end') _end?: number,
    ) {
        const restaurantId = req.user.restaurantId;

        const { data, total, summary } = await this.discountSlotService.getRestaurantDiscountUsages(
            restaurantId,
            _start,
            _end,
        );

        res.header('X-Total-Count', total.toString());
        res.header('Access-Control-Expose-Headers', 'X-Total-Count');

        return { data, summary };
    }

    @Get('my-reservations')
    @ApiBearerAuth()
    @Roles(Role.User, Role.SuperAdmin)
    @ApiOperation({ summary: 'Kullanıcının rezervasyonlarını getir' })
    @ApiQuery({
        name: '_start',
        required: false,
        description: 'Başlangıç index (varsayılan: 0)',
    })
    @ApiQuery({
        name: '_end',
        required: false,
        description: 'Bitiş index (varsayılan: 10)',
    })
    async getMyReservations(
        @Req() req: any,
        @Query('_start') _start?: number,
        @Query('_end') _end?: number,
    ) {
        return await this.discountSlotService.getUserReservations(
            req.user.userId,
            _start,
            _end,
        );
    }

    @Get(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
    @ApiOperation({ summary: 'Tek bir indirim programı getir' })
    @ApiParam({ name: 'id', description: 'İndirim programı ID' })
    async getOne(@Param('id') id: string) {
        return await this.discountSlotService.findOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'Yeni indirim programı oluştur' })
    async create(@Body() dto: CreateDiscountScheduleDto, @Req() req: any) {
        return await this.discountSlotService.create(dto, req.user.restaurantId);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'İndirim programı güncelle' })
    @ApiParam({ name: 'id', description: 'İndirim programı ID' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateDiscountScheduleDto,
    ) {
        return await this.discountSlotService.update(id, dto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin, Role.RestaurantOwner)
    @ApiOperation({ summary: 'İndirim programı sil' })
    @ApiParam({ name: 'id', description: 'İndirim programı ID' })
    async delete(@Param('id') id: string) {
        return await this.discountSlotService.delete(id);
    }

    // ==================== CLAIM / VALIDATE ====================

    @Post('claim')
    @ApiBearerAuth()
    @Roles(Role.User, Role.SuperAdmin)
    @ApiOperation({ summary: 'Slot rezerve et - QR kod al' })
    async claimSlot(@Body() dto: ClaimSlotDto, @Req() req: any) {
        return await this.discountSlotService.claimSlot(req.user.userId, dto);
    }

    @Post('validate')
    @ApiBearerAuth()
    @Roles(Role.RestaurantOwner, Role.SuperAdmin)
    @ApiOperation({ summary: 'Rezervasyonu doğrula ve indirim hesapla' })
    async validateSlot(@Body() dto: ValidateSlotDto, @Req() req: any) {
        return await this.discountSlotService.validateSlot(
            dto.reservationCode,
            dto.orderAmount,
            req.user.userId,
        );
    }
}
