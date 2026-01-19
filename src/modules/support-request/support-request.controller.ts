import { Body, Controller, Get, Post, Req, Query, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/common/guards/optional-jwt-auth.guard';
import { SupportRequestService } from './support-request.service';
import { CreateSupportRequestDto } from 'src/dtos/create-support-request.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('Support Request')
@Controller('support-request')
export class SupportRequestController {
    constructor(private readonly supportRequestService: SupportRequestService) { }

    @Post()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Destek talebi oluştur' })
    async create(@Body() dto: CreateSupportRequestDto, @Req() req: any) {
        const userId = req.user?.userId;
        const userEmail = req.user?.email;
        const userPhone = req.user?.phoneNumber;

        return await this.supportRequestService.createRequest(
            dto,
            userId,
            userEmail,
            userPhone,
        );
    }

    @Get()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Destek taleplerini listele (SuperAdmin)' })
    async list(@Query() query: any) {
        return await this.supportRequestService.list(query);
    }
}
