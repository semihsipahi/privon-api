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
  @ApiQuery({ name: 'shift', type: Number, description: '0=Kahvaltı,1=Öğle,2=Akşam,3=Bar' })
  getAvailableAreas(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('shift') shift: string,
  ) {
    return this.bookingService.getAvailableAreas(
      slug,
      parseInt(pax, 10),
      date,
      time,
      parseInt(shift, 10),
    );
  }

  @Post('venues/:slug/hold')
  @ApiOperation({ summary: 'Slot rezerve et (Rezervem checkout/hold)' })
  holdSlot(
    @Param('slug') slug: string,
    @Body()
    body: {
      pax: number;
      date: string;
      time: string;
      shift: number;
      roomId?: number;
      paymentMode?: 'immediate' | 'deferred';
    },
  ) {
    return this.bookingService.holdSlot({ slug, ...body });
  }

  @Post('venues/:slug/confirm')
  @ApiOperation({ summary: 'Hold edilen rezervasyonu onayla (Rezervem checkout/confirm)' })
  confirmReservation(
    @Param('slug') slug: string,
    @Body() body: { sessionId: string; model: any },
  ) {
    return this.bookingService.confirmReservation(slug, body.sessionId, body.model);
  }

  @Post('venues/:slug/finalize')
  @ApiOperation({ summary: 'Ödeme sonrası kesinleştir (Rezervem checkout/finalize)' })
  finalizeReservation(
    @Param('slug') slug: string,
    @Body() body: { sessionId: string; paymentCompleted: boolean; model: any },
  ) {
    return this.bookingService.finalizeReservation(
      slug,
      body.sessionId,
      body.paymentCompleted,
      body.model,
    );
  }
}
