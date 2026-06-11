import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RezervemHttpService } from './rezervem-http.service';
import { RezervemVenueService } from './rezervem-venue.service';
import { PendingPaymentService } from './pending-payment.service';
import { ConfigService } from '@nestjs/config';
import { ReservationService } from '../reservation/reservation.service';
import { Restaurant } from '../../models/restaurant.schema';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly rezervemHttp: RezervemHttpService,
    private readonly venueService: RezervemVenueService,
    private readonly pendingPaymentService: PendingPaymentService,
    private readonly configService: ConfigService,
    private readonly reservationService: ReservationService,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,
  ) {}

  /**
   * Bootstrap: önce rezervem_venues cache'ine bak.
   * Admin sync yaptıysa ve mekan cache'deyse, pax/bookingFlow bilgileri
   * oradan alınır. Cache'de yoksa canlı Rezervem API'ye düşer.
   */
  async getBootstrap(slug: string): Promise<object> {
    const cached = await this.venueService.findBySlug(slug);
    let result: any;
    if (cached) {
      this.logger.log(`Bootstrap: cache hit for ${slug}`);
      result = this.buildBootstrapFromCache(cached);
    } else {
      this.logger.log(`Bootstrap: cache miss for ${slug}, falling back to API`);
      result = await this.rezervemHttp.getBootstrap(slug);
    }

    // Restaurant'dan termsAndConditions al ve policies'e inject et
    const restaurant = await this.restaurantModel
      .findOne({ rezervemSlug: slug })
      .select('termsAndConditions')
      .lean();
    if (restaurant?.termsAndConditions) {
      result.policies = {
        ...(result.policies ?? {}),
        termsAndConditions: restaurant.termsAndConditions,
      };
    }

    return result;
  }

  private buildBootstrapFromCache(venue: any): object {
    const pax = venue.pax ?? {};
    const min: number = pax.min ?? 1;
    const max: number = pax.max ?? 10;
    const step: number = pax.step ?? 1;
    const paxOptions: number[] = [];
    for (let n = min; n <= max; n += step) paxOptions.push(n);

    return {
      venueId: venue.slug,
      slug: venue.slug,
      name: venue.name,
      bookingFlow: venue.bookingFlow ?? {
        type: 'normal',
        steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'],
      },
      paxOptions,
      minPax: min,
      maxPax: max,
      currency: venue.currency || 'TRY',
      holdTtlSeconds: 600,
      policies: venue.policies ?? {},
      genderPolicy: venue.genderPolicy ?? false,
      paymentPreview: venue.paymentPreview ?? null,
      tastingMenu: venue.tastingMenu ?? null,
      uiHints: venue.uiHints ?? {},
      leadTimes: venue.leadTimes ?? null,
    };
  }

  getVenues() {
    return this.rezervemHttp.getVenues();
  }

  getAvailableDates(slug: string, pax: number) {
    return this.rezervemHttp.getAvailableDates(slug, pax);
  }

  getAvailableTimes(slug: string, pax: number, date: string) {
    return this.rezervemHttp.getAvailableTimes(slug, pax, date);
  }

  async getAvailableAreas(
    slug: string,
    pax: number,
    date: string,
    time: string,
    shift: number,
  ) {
    const result: any = await this.rezervemHttp.getAvailableAreas(
      slug,
      pax,
      date,
      time,
      shift,
    );

    // Restoranın DB'deki salon görsellerini Rezervem area'larıyla eşleştir.
    // areaId → imageUrl eşlemesi kullanılır; bizim yüklediğimiz görsel önceliklidir.
    const restaurant = await this.restaurantModel
      .findOne({ rezervemSlug: slug })
      .select('venueAreaImages')
      .lean();

    const photoList: { areaId: string; imageUrl: string }[] =
      (restaurant as any)?.venueAreaImages ?? [];
    if (photoList.length > 0) {
      const photoMap = new Map<string, string>(
        photoList.map((v) => [v.areaId, v.imageUrl]),
      );
      result.areas = ((result.areas ?? []) as any[]).map((area: any) => ({
        ...area,
        imageUrl: photoMap.get(String(area.id)) ?? area.imageUrl,
      }));
    }

    return result;
  }

  async holdSlot(params: {
    slug: string;
    pax: number;
    date: string;
    time: string;
    shift: number;
    areaId?: string;
    roomId?: number;
    paymentMode?: 'immediate' | 'deferred';
  }) {
    // Mobile app always uses immediate mode by default.
    // Mobile can override by passing paymentMode in the hold body.
    const paymentMode = params.paymentMode ?? 'immediate';
    return this.rezervemHttp.holdSlot({ ...params, paymentMode });
  }

  async confirmHold(
    holdId: string,
    guestInfo: {
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
    },
  ) {
    const result: any = await this.rezervemHttp.confirmHold(holdId, guestInfo);

    // If payment is required, save pending_payment for returnUrl callback
    if (result?.status === 'payment_required') {
      const sepIdx = holdId.indexOf('::');
      const sessionId = sepIdx >= 0 ? holdId.slice(sepIdx + 2) : '';
      if (sessionId) {
        await this.pendingPaymentService
          .create({
            sessionId,
            slug: holdId.split('::')[0],
            guestInfo,
            status: 'pending',
          })
          .catch((err) =>
            this.logger.error(
              `[confirmHold] failed to save pending_payment: ${err.message}`,
            ),
          );
      }
    }

    return result;
  }

  async payHold(
    holdId: string,
    cardDetails: {
      cardNumber: string;
      holderName: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
    },
  ): Promise<{ redirectUrl: string; status: string }> {
    const sepIdx = holdId.indexOf('::');
    if (sepIdx < 0)
      throw new Error('Geçersiz rezervasyon oturumu. Lütfen tekrar deneyin.');
    const slug = holdId.slice(0, sepIdx);
    const sessionId = holdId.slice(sepIdx + 2);

    const baseUrl = this.configService.get<string>('BASE_URL_FRONT');
    const returnUrl = `${baseUrl}/payment/callback?sessionId=${sessionId}`;

    this.logger.log(
      `[payHold] slug=${slug} sessionId=${sessionId} returnUrl=${returnUrl}`,
    );
    return this.rezervemHttp.paySlot({
      slug,
      sessionId,
      ...cardDetails,
      returnUrl,
    });
  }

  finalizeHold(
    holdId: string,
    paymentCompleted: boolean,
    guestInfo: {
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
    },
  ) {
    return this.rezervemHttp.finalizeHold(holdId, paymentCompleted, guestInfo);
  }

  async processPaymentCallback(
    sessionId: string,
    status: string,
    transactionId?: string,
    message?: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `[payment/callback] sessionId=${sessionId} status=${status} transactionId=${transactionId ?? '-'} message=${message ?? '-'}`,
    );

    const pending = await this.pendingPaymentService.findBySessionId(sessionId);
    if (!pending) {
      this.logger.warn(
        `[payment/callback] no pending payment found for sessionId=${sessionId}`,
      );
      return { success: false, message: 'Ödeme oturumu bulunamadı.' };
    }

    if (pending.status !== 'pending') {
      this.logger.log(
        `[payment/callback] sessionId=${sessionId} already ${pending.status}, skipping`,
      );
      return { success: true, message: 'Rezervasyon zaten tamamlanmış.' };
    }

    if (status?.toLowerCase() !== 'success') {
      await this.pendingPaymentService.updateStatus(sessionId, 'failed', {
        transactionId,
        errorMessage: message,
      });
      return { success: false, message: message || 'Ödeme tamamlanamadı.' };
    }

    try {
      const slug = pending.slug;
      const holdId = `${slug}::${sessionId}`;
      const finalResult: any = await this.rezervemHttp.finalizeHold(
        holdId,
        true,
        {
          firstName: pending.guestInfo.firstName,
          lastName: pending.guestInfo.lastName,
          phone: pending.guestInfo.phone,
          email: pending.guestInfo.email,
          note: pending.guestInfo.note,
          femaleCount: pending.guestInfo.femaleCount,
          needInvoice: pending.guestInfo.needInvoice,
          company: pending.guestInfo.company,
        },
      );

      await this.pendingPaymentService.updateStatus(sessionId, 'finalized', {
        transactionId,
      });
      this.logger.log(
        `[payment/callback] sessionId=${sessionId} → Finalized, code=${(finalResult as any)?.confirmationCode ?? '-'}`,
      );
      return {
        success: true,
        message: 'Ödemeniz alındı, rezervasyonunuz onaylandı.',
      };
    } catch (err: any) {
      await this.pendingPaymentService.updateStatus(sessionId, 'failed', {
        transactionId,
        errorMessage: err.message,
      });
      this.logger.error(
        `[payment/callback] sessionId=${sessionId} → Finalize failed: ${err.message}`,
      );
      return {
        success: false,
        message:
          'Ödeme doğrulanamadı. Lütfen müşteri hizmetleriyle iletişime geçin.',
      };
    }
  }

  async saveRezervemReservation(
    userId: string,
    slug: string,
    data: {
      pax: number;
      date: string;
      time: string;
      areaName?: string;
      note?: string;
      confirmationCode?: string;
      rezervemId?: string;
    },
  ) {
    const restaurant = await this.restaurantModel
      .findOne({ rezervemSlug: slug })
      .select('_id')
      .lean();
    if (!restaurant) {
      this.logger.warn(
        `saveRezervemReservation: restaurant not found for slug=${slug}`,
      );
      return null;
    }
    return this.reservationService.saveRezervemReservation(userId, {
      restaurantId: restaurant._id.toString(),
      rezervemSlug: slug,
      ...data,
    });
  }

  getRezervemReservation(id: number, slug?: string) {
    return this.rezervemHttp.getRezervemReservation(id, slug);
  }

  confirmReservation(slug: string, sessionId: string, model: any) {
    return this.rezervemHttp.confirmReservation(slug, sessionId, model);
  }

  finalizeReservation(
    slug: string,
    sessionId: string,
    paymentCompleted: boolean,
    model: any,
  ) {
    return this.rezervemHttp.finalizeReservation(
      slug,
      sessionId,
      paymentCompleted,
      model,
    );
  }
}
