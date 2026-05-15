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

  getAvailableAreas(slug: string, pax: number, date: string, time: string) {
    return this.rezervemHttp.getAvailableAreas(slug, pax, date, time);
  }

  holdSlot(params: { slug: string; pax: number; date: string; time: string; areaId: string }) {
    return this.rezervemHttp.holdSlot(params);
  }

  confirmReservation(holdId: string, guestInfo: object) {
    return this.rezervemHttp.confirmReservation(holdId, guestInfo);
  }
}
