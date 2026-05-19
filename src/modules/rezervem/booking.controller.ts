import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './booking.service';

@ApiTags('Booking (Rezervem)')
@ApiBearerAuth()
@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @Get('venues')
  @ApiOperation({ summary: 'Rezervem mekan listesi' })
  getVenues() {
    return this.bookingService.getVenues();
  }

  @Get('venues/:slug/bootstrap')
  @ApiOperation({ summary: 'Mekan bootstrap verisi (rezervasyon akışı yapılandırması)' })
  async getBootstrap(@Param('slug') slug: string) {
    const raw: any = await this.bookingService.getBootstrap(slug);
    if (Array.isArray(raw?.paxOptions)) return raw;
    // Real Rezervem format → map to BookingBootstrap
    return this.mapToBookingBootstrap(slug, raw);
  }

  private mapToBookingBootstrap(slug: string, raw: any): object {
    const i18n = (v: any): string => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      return v.tr || v.en || '';
    };
    const pax = raw?.pax ?? {};
    const min = pax.min ?? 1;
    const max = pax.max ?? 10;
    const step = pax.step ?? 1;
    const paxOptions: number[] = [];
    for (let n = min; n <= max; n += step) paxOptions.push(n);
    return {
      venueId: raw?.venue?.slug ?? slug,
      slug,
      name: i18n(raw?.venue?.displayName) || slug,
      bookingFlow: raw?.bookingFlow ?? { type: 'normal', steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'] },
      paxOptions,
      minPax: min,
      maxPax: max,
      currency: raw?.venue?.currency ?? 'TRY',
      holdTtlSeconds: 600,
      policies: {},
    };
  }

  @Get('venues/:slug/availability/dates')
  @ApiOperation({ summary: 'Müsait tarihleri listele' })
  @ApiQuery({ name: 'pax', type: Number, description: 'Kişi sayısı' })
  getAvailableDates(@Param('slug') slug: string, @Query('pax') pax: string) {
    this.logger.log(`getAvailableDates slug=${slug} pax=${pax}`);
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
    this.logger.log(`getAvailableTimes slug=${slug} pax=${pax} date=${date}`);
    return this.bookingService.getAvailableTimes(slug, parseInt(pax, 10), date);
  }

  @Get('venues/:slug/availability/areas')
  @ApiOperation({ summary: 'Seçilen tarih ve saat için müsait alanları listele' })
  @ApiQuery({ name: 'pax', type: Number })
  @ApiQuery({ name: 'date', type: String })
  @ApiQuery({ name: 'time', type: String, description: 'HH:mm' })
  @ApiQuery({ name: 'shift', required: false, type: Number, description: '0=Kahvaltı,1=Öğle,2=Akşam,3=Bar' })
  getAvailableAreas(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('shift') shift: string,
  ) {
    this.logger.log(`getAvailableAreas slug=${slug} pax=${pax} date=${date} time=${time}`);
    const shiftNum = shift ? parseInt(shift, 10) : this.shiftFromTime(time);
    return this.bookingService.getAvailableAreas(slug, parseInt(pax, 10), date, time, shiftNum);
  }

  @Post('venues/:slug/hold')
  @ApiOperation({ summary: 'Slot rezerve et' })
  holdSlot(
    @Param('slug') slug: string,
    @Body()
    body: {
      pax: number;
      date: string;
      time: string;
      areaId?: string;
      shift?: number;
      roomId?: number;
      paymentMode?: 'immediate' | 'deferred';
    },
  ) {
    this.logger.log(`holdSlot slug=${slug} body=${JSON.stringify(body)}`);
    const shift = body.shift ?? this.shiftFromTime(body.time);
    return this.bookingService.holdSlot({ slug, ...body, shift });
  }

  // Mobile-compatible confirm endpoint: POST /booking/holds/:holdId/confirm
  @Post('holds/:holdId/confirm')
  @ApiOperation({ summary: 'Hold edilen rezervasyonu onayla (mobile)' })
  confirmHold(
    @Param('holdId') holdId: string,
    @Body() body: {
      guestInfo?: { firstName: string; lastName: string; phone: string; email?: string; note?: string };
      firstName?: string; lastName?: string; phone?: string; email?: string; note?: string;
    },
  ) {
    this.logger.log(`confirmHold holdId=${holdId}`);
    const guest = body.guestInfo ?? {
      firstName: body.firstName!,
      lastName: body.lastName!,
      phone: body.phone!,
      email: body.email,
      note: body.note,
    };
    return this.bookingService.confirmHold(holdId, guest);
  }

  // Mobile-compatible finalize endpoint: POST /booking/holds/:holdId/finalize
  // Called after 3D-Secure / Provision payment completes in WebView (Scenario B/D)
  @Post('holds/:holdId/finalize')
  @ApiOperation({ summary: 'Ödeme sonrası rezervasyonu tamamla (mobile)' })
  finalizeHold(
    @Param('holdId') holdId: string,
    @Body() body: {
      paymentCompleted: boolean;
      guestInfo?: { firstName: string; lastName: string; phone: string; email?: string; note?: string };
      firstName?: string; lastName?: string; phone?: string; email?: string; note?: string;
    },
  ) {
    this.logger.log(`finalizeHold holdId=${holdId} paymentCompleted=${body.paymentCompleted}`);
    const guest = body.guestInfo ?? {
      firstName: body.firstName!,
      lastName: body.lastName!,
      phone: body.phone!,
      email: body.email,
      note: body.note,
    };
    return this.bookingService.finalizeHold(holdId, body.paymentCompleted, guest);
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
    return this.bookingService.finalizeReservation(slug, body.sessionId, body.paymentCompleted, body.model);
  }

  private shiftFromTime(time: string): number {
    const hour = parseInt((time ?? '19:00').split(':')[0], 10);
    if (hour < 11) return 0; // Kahvaltı
    if (hour < 15) return 1; // Öğle
    if (hour < 18) return 3; // Bar/Aperitif
    return 2;                // Akşam
  }
}
