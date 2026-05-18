import { Injectable } from '@nestjs/common';
import { RezervemHttpService } from './rezervem-http.service';

@Injectable()
export class BookingService {
  constructor(private readonly rezervemHttp: RezervemHttpService) {}

  getVenues() {
    return this.rezervemHttp.getVenues();
  }

  getBootstrap(slug: string) {
    return this.rezervemHttp.getBootstrap(slug);
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

  holdSlot(params: {
    slug: string;
    pax: number;
    date: string;
    time: string;
    shift: number;
    roomId?: number;
    paymentMode?: 'immediate' | 'deferred';
  }) {
    return this.rezervemHttp.holdSlot(params);
  }

  confirmReservation(slug: string, sessionId: string, model: any) {
    return this.rezervemHttp.confirmReservation(slug, sessionId, model);
  }

  finalizeReservation(slug: string, sessionId: string, paymentCompleted: boolean, model: any) {
    return this.rezervemHttp.finalizeReservation(slug, sessionId, paymentCompleted, model);
  }
}
