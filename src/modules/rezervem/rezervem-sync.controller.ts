import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { RezervemVenueService } from './rezervem-venue.service';

@ApiTags('Rezervem Admin')
@ApiBearerAuth()
@Controller('admin/rezervem')
export class RezervemSyncController {
  constructor(private readonly venueService: RezervemVenueService) {}

  @Get('status')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Rezervem cache durumu (toplam mekan, son sync vb.)' })
  status() {
    return this.venueService.getStatus();
  }

  @Post('sync')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Rezervem mekanlarını manuel tetiklenen sync ile çek' })
  async sync() {
    const report = await this.venueService.syncAll();
    return report;
  }
}
