import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
  Request,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { Public } from '../../common/decorators/public.decorator';

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
  @ApiOperation({
    summary: 'Mekan bootstrap verisi (rezervasyon akışı yapılandırması)',
  })
  async getBootstrap(@Param('slug') slug: string) {
    this.logger.log(`[FLOW] ① BOOTSTRAP slug=${slug}`);
    const raw: any = await this.bookingService.getBootstrap(slug);
    const result = Array.isArray(raw?.paxOptions)
      ? raw
      : this.mapToBookingBootstrap(slug, raw);

    this.logger.log(
      `[FLOW] ① BOOTSTRAP slug=${slug} → paxOptions=${JSON.stringify((result as any).paxOptions)} flow=${JSON.stringify((result as any).bookingFlow?.steps ?? [])}`,
    );
    return result;
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
      bookingFlow: raw?.bookingFlow ?? {
        type: 'normal',
        steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'],
      },
      paxOptions,
      minPax: min,
      maxPax: max,
      currency: raw?.venue?.currency ?? 'TRY',
      holdTtlSeconds: 600,
      policies: {},
      groupBooking: raw?.groupBooking ?? null,
      paymentPreview: raw?.paymentPreview ?? null,
      tastingMenu: raw?.tastingMenu ?? null,
      uiHints: raw?.uiHints ?? {},
      genderPolicy: raw?.genderPolicy ?? false,
      leadTimes: raw?.leadTimes ?? null,
    };
  }

  @Get('venues/:slug/availability/dates')
  @ApiOperation({ summary: 'Müsait tarihleri listele' })
  @ApiQuery({ name: 'pax', type: Number, description: 'Kişi sayısı' })
  async getAvailableDates(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
  ) {
    this.logger.log(`[FLOW] ② DATES  slug=${slug} pax=${pax}`);
    const result: any = await this.bookingService.getAvailableDates(
      slug,
      parseInt(pax, 10),
    );
    const available = result?.availableDates?.length ?? 0;
    const lowStock = result?.lowStockDates?.length ?? 0;
    this.logger.log(
      `[FLOW] ② DATES  slug=${slug} pax=${pax} → available=${available} lowStock=${lowStock}`,
    );
    return result;
  }

  @Get('venues/:slug/availability/times')
  @ApiOperation({ summary: 'Seçilen tarih için müsait saatleri listele' })
  @ApiQuery({ name: 'pax', type: Number })
  @ApiQuery({ name: 'date', type: String, description: 'YYYY-MM-DD' })
  async getAvailableTimes(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
  ) {
    this.logger.log(`[FLOW] ③ TIMES  slug=${slug} pax=${pax} date=${date}`);
    const result: any = await this.bookingService.getAvailableTimes(
      slug,
      parseInt(pax, 10),
      date,
    );
    const total = result?.slots?.length ?? 0;
    const avail = result?.slots?.filter((s: any) => s.available)?.length ?? 0;
    this.logger.log(
      `[FLOW] ③ TIMES  slug=${slug} date=${date} → slots=${total} available=${avail}`,
    );
    return result;
  }

  @Get('venues/:slug/availability/areas')
  @ApiOperation({
    summary: 'Seçilen tarih ve saat için müsait alanları listele',
  })
  @ApiQuery({ name: 'pax', type: Number })
  @ApiQuery({ name: 'date', type: String })
  @ApiQuery({ name: 'time', type: String, description: 'HH:mm' })
  @ApiQuery({
    name: 'shift',
    required: false,
    type: Number,
    description: '0=Kahvaltı,1=Öğle,2=Akşam,3=Bar',
  })
  async getAvailableAreas(
    @Param('slug') slug: string,
    @Query('pax') pax: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('shift') shift: string,
  ) {
    this.logger.log(
      `[FLOW] ④ AREAS  slug=${slug} pax=${pax} date=${date} time=${time}`,
    );
    const shiftNum = shift ? parseInt(shift, 10) : this.shiftFromTime(time);
    const result: any = await this.bookingService.getAvailableAreas(
      slug,
      parseInt(pax, 10),
      date,
      time,
      shiftNum,
    );
    const areas = result?.areas ?? [];
    const names = areas.map((a: any) => a.name ?? a.id).join(', ') || '(none)';
    this.logger.log(
      `[FLOW] ④ AREAS  slug=${slug} date=${date} time=${time} → count=${areas.length} areas=[${names}]`,
    );
    return result;
  }

  @Post('venues/:slug/hold')
  @ApiOperation({ summary: 'Slot rezerve et' })
  async holdSlot(
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
    this.logger.log(
      `[FLOW] ⑤ HOLD   slug=${slug} pax=${body.pax} date=${body.date} time=${body.time} area=${body.areaId ?? '-'} paymentMode=${body.paymentMode ?? 'immediate'}`,
    );
    const shift = body.shift ?? this.shiftFromTime(body.time);
    const result: any = await this.bookingService.holdSlot({
      slug,
      ...body,
      shift,
    });
    this.logger.log(
      `[FLOW] ⑤ HOLD   slug=${slug} → holdId=${result?.holdId ?? 'NONE'} status=${result?.status ?? '?'} expiresAt=${result?.expiresAt ?? '-'}`,
    );
    return result;
  }

  // Mobile-compatible pay endpoint: POST /booking/holds/:holdId/pay
  // Called after Confirm returns PAYMENT_REQUIRED — sends card details to Rezervem, gets redirectUrl for 3DS
  @Post('holds/:holdId/pay')
  @ApiOperation({ summary: 'Ödeme başlat (kart + 3DS) — redirectUrl döner' })
  async payHold(
    @Param('holdId') holdId: string,
    @Body()
    body: {
      cardNumber: string;
      holderName: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
    },
  ) {
    const slug = holdId.split('::')[0];
    this.logger.log(`[FLOW] ⑥.5 PAY   slug=${slug} holdId=${holdId}`);
    const result = await this.bookingService.payHold(holdId, body);
    this.logger.log(
      `[FLOW] ⑥.5 PAY   slug=${slug} → redirectUrl=${(result as any)?.redirectUrl?.slice(0, 80) ?? 'NONE'}`,
    );
    return result;
  }

  // Mobile-compatible confirm endpoint: POST /booking/holds/:holdId/confirm
  @Post('holds/:holdId/confirm')
  @ApiOperation({ summary: 'Hold edilen rezervasyonu onayla (mobile)' })
  async confirmHold(
    @Param('holdId') holdId: string,
    @Body()
    body: {
      guestInfo?: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        note?: string;
        femaleCount?: number;
        needInvoice?: boolean;
        company?: {
          title?: string;
          address?: string;
          taxOffice?: string;
          taxNumber?: string;
        };
      };
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      note?: string;
      femaleCount?: number;
      bookingMeta?: {
        pax: number;
        date: string;
        time: string;
        areaName?: string;
      };
    },
    @Request() req: any,
  ) {
    const slug = holdId.split('::')[0];
    this.logger.log(
      `[FLOW] ⑥ CONFIRM slug=${slug} holdId=${holdId} user=${req.user?.userId ?? 'anon'}`,
    );
    const guest = body.guestInfo ?? {
      firstName: body.firstName!,
      lastName: body.lastName!,
      phone: body.phone!,
      email: body.email,
      note: body.note,
      femaleCount: body.femaleCount,
      needInvoice: body.guestInfo?.needInvoice,
      company: body.guestInfo?.company,
    };
    const result = await this.bookingService.confirmHold(
      holdId,
      guest,
      req.user?.userId,
      body.bookingMeta,
    );
    const r = result as any;
    this.logger.log(
      `[FLOW] ⑥ CONFIRM slug=${slug} → status=${r.status} code=${r.confirmationCode || '-'} paymentRequired=${r.paymentRequired ?? false} paymentType=${r.paymentType || '-'}`,
    );

    if (
      body.bookingMeta &&
      req.user?.userId &&
      r.status !== 'payment_required'
    ) {
      try {
        await this.bookingService.saveRezervemReservation(
          req.user.userId,
          slug,
          {
            pax: body.bookingMeta.pax,
            date: body.bookingMeta.date,
            time: body.bookingMeta.time,
            areaName: body.bookingMeta.areaName,
            note: guest.note,
            confirmationCode: r.confirmationCode,
            rezervemId: r.reservationId,
          },
        );
        this.logger.log(
          `[FLOW] ⑥ CONFIRM slug=${slug} → reservation saved to DB code=${r.confirmationCode}`,
        );
      } catch (err) {
        this.logger.error(
          `[FLOW] ⑥ CONFIRM slug=${slug} → DB save failed: ${err?.message}`,
        );
      }
    }

    return result;
  }

  // Mobile-compatible finalize endpoint: POST /booking/holds/:holdId/finalize
  // Called after 3D-Secure / Provision payment completes in WebView (Scenario B/D)
  @Post('holds/:holdId/finalize')
  @ApiOperation({ summary: 'Ödeme sonrası rezervasyonu tamamla (mobile)' })
  async finalizeHold(
    @Param('holdId') holdId: string,
    @Body()
    body: {
      paymentCompleted: boolean;
      guestInfo?: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        note?: string;
        femaleCount?: number;
        needInvoice?: boolean;
        company?: {
          title?: string;
          address?: string;
          taxOffice?: string;
          taxNumber?: string;
        };
      };
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      note?: string;
      femaleCount?: number;
      bookingMeta?: {
        pax: number;
        date: string;
        time: string;
        areaName?: string;
      };
    },
    @Request() req: any,
  ) {
    const slugFin = holdId.split('::')[0];
    this.logger.log(
      `[FLOW] ⑦ FINALIZE slug=${slugFin} holdId=${holdId} paymentCompleted=${body.paymentCompleted} user=${req.user?.userId ?? 'anon'}`,
    );
    const guest = body.guestInfo ?? {
      firstName: body.firstName!,
      lastName: body.lastName!,
      phone: body.phone!,
      email: body.email,
      note: body.note,
      femaleCount: body.femaleCount,
      needInvoice: body.guestInfo?.needInvoice,
      company: body.guestInfo?.company,
    };
    const result = await this.bookingService.finalizeHold(
      holdId,
      body.paymentCompleted,
      guest,
    );
    const rf = result as any;
    this.logger.log(
      `[FLOW] ⑦ FINALIZE slug=${slugFin} → status=${rf.status} code=${rf.confirmationCode || '-'}`,
    );

    if (body.paymentCompleted && body.bookingMeta && req.user?.userId) {
      try {
        await this.bookingService.saveRezervemReservation(
          req.user.userId,
          slugFin,
          {
            pax: body.bookingMeta.pax,
            date: body.bookingMeta.date,
            time: body.bookingMeta.time,
            areaName: body.bookingMeta.areaName,
            note: guest.note,
            confirmationCode: rf.confirmationCode,
            rezervemId: rf.reservationId,
          },
        );
        this.logger.log(
          `[FLOW] ⑦ FINALIZE slug=${slugFin} → reservation saved to DB code=${rf.confirmationCode}`,
        );
      } catch (err) {
        this.logger.error(
          `[FLOW] ⑦ FINALIZE slug=${slugFin} → DB save failed: ${err?.message}`,
        );
      }
    }

    return result;
  }

  // Rezervasyon canlı durumu — Rezervem Partner API izinleri açılınca aktif edilecek
  @Get('reservation/:rezervemId')
  @ApiOperation({ summary: 'Rezervem rezervasyon durumunu getir' })
  @ApiQuery({ name: 'slug', required: false, type: String })
  async getRezervemReservation(
    @Param('rezervemId') rezervemId: string,
    @Query('slug') slug?: string,
  ) {
    const id = parseInt(rezervemId, 10);
    if (isNaN(id)) throw new BadRequestException('Geçersiz rezervasyon ID');
    return this.bookingService.getRezervemReservation(id, slug);
  }

  @Post('venues/:slug/confirm')
  @ApiOperation({
    summary: 'Hold edilen rezervasyonu onayla (Rezervem checkout/confirm)',
  })
  confirmReservation(
    @Param('slug') slug: string,
    @Body() body: { sessionId: string; model: any },
  ) {
    return this.bookingService.confirmReservation(
      slug,
      body.sessionId,
      body.model,
    );
  }

  @Post('venues/:slug/finalize')
  @ApiOperation({
    summary: 'Ödeme sonrası kesinleştir (Rezervem checkout/finalize)',
  })
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

  // returnUrl callback — 3DS sonrası Rezervem buraya yönlendirir
  // Query params: status, sessionId, transactionId, message
  @Get('payment/callback')
  @Public()
  @ApiExcludeEndpoint()
  async paymentCallback(
    @Query('status') status: string,
    @Query('sessionId') sessionId: string,
    @Query('transactionId') transactionId?: string,
    @Query('message') message?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    this.logger.log(
      `[payment/callback] → status=${status} sessionId=${sessionId} ua=${(userAgent ?? '').slice(0, 60)}`,
    );

    if (!sessionId || !status) {
      return this.htmlResponse(false, 'Eksik parametre.');
    }

    const result = await this.bookingService.processPaymentCallback(
      sessionId,
      status,
      transactionId,
      message,
    );
    return this.htmlResponse(result.success, result.message);
  }

  private htmlResponse(success: boolean, message: string): string {
    const icon = success ? '✅' : '❌';
    const title = success ? 'Ödeme Başarılı' : 'Ödeme Başarısız';
    const color = success ? '#16a34a' : '#dc2626';
    return `<!DOCTYPE html>
<html lang="tr">
<head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f2ee; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
.card { background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 360px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.icon { font-size: 48px; margin-bottom: 16px; }
h1 { font-size: 20px; font-weight: 700; color: #171717; margin-bottom: 8px; }
p { font-size: 14px; color: #737373; line-height: 1.5; }
.badge { display: inline-block; margin-top: 20px; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; color: ${color}; background: ${color}15; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <div class="badge">Privon</div>
</div>
</body>
</html>`;
  }

  private shiftFromTime(time: string): number {
    const hour = parseInt((time ?? '19:00').split(':')[0], 10);
    if (hour < 11) return 0; // Kahvaltı
    if (hour < 15) return 1; // Öğle
    if (hour < 18) return 3; // Bar/Aperitif
    return 2; // Akşam
  }
}
