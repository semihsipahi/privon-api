import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './booking.service';

@ApiTags('Booking (Rezervem)')
@ApiBearerAuth()
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('venues')
  @ApiOperation({ summary: 'Rezervem mekan listesi' })
  getVenues() {
    return this.bookingService.getVenues();
  }

  @Get('venues/:slug/bootstrap')
  @ApiOperation({ summary: 'Mekan bootstrap verisi (rezervasyon akışı yapılandırması)' })
  getBootstrap(@Param('slug') slug: string) {
    return this.bookingService.getBootstrap(slug);
  }

  @Get('venues/:slug/availability/dates')
  @ApiOperation({ summary: 'Müsait tarihleri listele' })
  @ApiQuery({ name: 'pax', type: Number, description: 'Kişi sayısı' })
  getAvailableDates(@Param('slug') slug: string, @Query('pax') pax: string) {
    return this.bookingService.getAvailableDates(slug, parseInt(pax, 10));
  }

  @Get('venues/:slug/availability/times')
  @ApiOperation({ summary: 'Seçilen tarih için müsait saatleri listele' })
  @ApiQuery({ name: 'pax', type: Number })
  @ApiQuery({ name: 'date', type: String, description: 'YYYY-MM-DD' })
  getAvailableTimes(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableTimes(slug, parseInt(pax, 10), date);
  }

  @Get('venues/:slug/availability/areas')
  @ApiOperation({ summary: 'Seçilen tarih ve saat için müsait alanları listele' })
  @ApiQuery({ name: 'pax', type: Number })
  @ApiQuery({ name: 'date', type: String })
  @ApiQuery({ name: 'time', type: String, description: 'HH:mm' })
  getAvailableAreas(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    return this.bookingService.getAvailableAreas(slug, parseInt(pax, 10), date, time);
  }

  @Post('venues/:slug/hold')
  @ApiOperation({ summary: 'Slot rezerve et (10 dakika TTL)' })
  holdSlot(
    @Param('slug') slug: string,
    @Body() body: { pax: number; date: string; time: string; areaId: string },
  ) {
    return this.bookingService.holdSlot({ slug, ...body });
  }

  @Post('holds/:holdId/confirm')
  @ApiOperation({ summary: 'Hold edilen rezervasyonu onayla' })
  confirmReservation(
    @Param('holdId') holdId: string,
    @Body() body: { guestInfo: object },
  ) {
    return this.bookingService.confirmReservation(holdId, body.guestInfo);
  }
}
