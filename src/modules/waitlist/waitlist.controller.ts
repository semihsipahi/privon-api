import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from 'src/dtos/create-waitlist.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { Public } from 'src/common/decorators/public.decorator';


@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
    constructor(private readonly waitlistService: WaitlistService) { }

    @Post()
    @Public()
    @ApiOperation({ summary: 'Waitlist başvurusu oluştur' })
    async create(@Body() dto: CreateWaitlistDto) {
        return await this.waitlistService.createWaitlist(dto);
    }

    @Get()
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Waitlist başvurularını listele (SuperAdmin)' })
    async list(@Query() query: any) {
        return await this.waitlistService.list(query);
    }

    @Post("mail-gonder")
    @ApiBearerAuth()
    @Roles(Role.SuperAdmin)
    @ApiOperation({ summary: 'Waitlist başvurularına mail gönder (SuperAdmin)' })
    async sendMail(@Body() dto: { email: string, code: string }) {
        return await this.waitlistService.sendMail(dto);
    }
}
