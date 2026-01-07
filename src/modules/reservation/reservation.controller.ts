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
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { RequiresOwnership } from 'src/common/decorators/requires-ownership.decorator';
import { ResourceOwnerGuard } from 'src/common/guards/resource-owner.guard';

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
        return await this.reservationService.list(query);
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
                    enum: ['pending', 'confirmed', 'seated', 'no_show', 'cancelled', 'completed'],
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
}
