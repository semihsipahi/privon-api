import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RezervemHttpService } from './rezervem-http.service';
import { RezervemVenueService } from './rezervem-venue.service';
import { ReservationService } from '../reservation/reservation.service';
import { Restaurant } from '../../models/restaurant.schema';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly rezervemHttp: RezervemHttpService,
    private readonly venueService: RezervemVenueService,
    private readonly reservationService: ReservationService,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
  ) {}

  /**
   * Bootstrap: önce rezervem_venues cache'ine bak.
   * Admin sync yaptıysa ve mekan cache'deyse, pax/bookingFlow bilgileri
   * oradan alınır. Cache'de yoksa canlı Rezervem API'ye düşer.
   */
  async getBootstrap(slug: string): Promise<object> {
    const cached = await this.venueService.findBySlug(slug);
    if (cached) {
      this.logger.log(`Bootstrap: cache hit for ${slug}`);
      return this.buildBootstrapFromCache(cached);
    }
    this.logger.log(`Bootstrap: cache miss for ${slug}, falling back to API`);
    return this.rezervemHttp.getBootstrap(slug);
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
      bookingFlow: venue.bookingFlow ?? { type: 'normal', steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'] },
      paxOptions,
      minPax: min,
      maxPax: max,
      currency: venue.currency || 'TRY',
      holdTtlSeconds: 600,
      policies: venue.policies ?? {},
      genderPolicy: venue.genderPolicy ?? false,
      paymentPreview: venue.paymentPreview ?? null,
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

  getAvailableAreas(slug: string, pax: number, date: string, time: string, shift: number) {
    return this.rezervemHttp.getAvailableAreas(slug, pax, date, time, shift);
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
    // Auto-detect Pre-Authorization venues: if mobile didn't explicitly pass a paymentMode,
    // check the cached venue's paymentPreview. If mayRequire.preauth is true, Rezervem
    // expects paymentMode:"deferred" on the hold — confirmed with "FINANCIAL" + url on confirm.
    let paymentMode = params.paymentMode;
    if (!paymentMode) {
      const cached = await this.venueService.findBySlug(params.slug);
      const isPreAuth = cached?.paymentPreview?.mayRequire?.preauth === true;
      paymentMode = isPreAuth ? 'deferred' : 'immediate';
      if (isPreAuth) {
        this.logger.log(`[holdSlot] Pre-Auth venue detected (slug=${params.slug}), using paymentMode=deferred`);
      }
    }
    return this.rezervemHttp.holdSlot({ ...params, paymentMode });
  }

  confirmHold(holdId: string, guestInfo: { firstName: string; lastName: string; phone: string; email?: string; note?: string; femaleCount?: number }) {
    return this.rezervemHttp.confirmHold(holdId, guestInfo);
  }

  finalizeHold(holdId: string, paymentCompleted: boolean, guestInfo: { firstName: string; lastName: string; phone: string; email?: string; note?: string; femaleCount?: number }) {
    return this.rezervemHttp.finalizeHold(holdId, paymentCompleted, guestInfo);
  }

  async saveRezervemReservation(userId: string, slug: string, data: {
    pax: number;
    date: string;
    time: string;
    areaName?: string;
    note?: string;
    confirmationCode?: string;
    rezervemId?: string;
  }) {
    const restaurant = await this.restaurantModel.findOne({ rezervemSlug: slug }).select('_id').lean();
    if (!restaurant) {
      this.logger.warn(`saveRezervemReservation: restaurant not found for slug=${slug}`);
      return null;
    }
    return this.reservationService.saveRezervemReservation(userId, {
      restaurantId: restaurant._id.toString(),
      rezervemSlug: slug,
      ...data,
    });
  }

  getRezervemReservation(id: number) {
    return this.rezervemHttp.getRezervemReservation(id);
  }

  confirmReservation(slug: string, sessionId: string, model: any) {
    return this.rezervemHttp.confirmReservation(slug, sessionId, model);
  }

  finalizeReservation(slug: string, sessionId: string, paymentCompleted: boolean, model: any) {
    return this.rezervemHttp.finalizeReservation(slug, sessionId, paymentCompleted, model);
  }
}
