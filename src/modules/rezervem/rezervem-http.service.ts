import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RezervemAuthService } from './rezervem-auth.service';
import { MOCK_VENUES } from './mock/venues.mock';
import { getMockBootstrap } from './mock/bootstrap.mock';
import { getMockAvailableDates } from './mock/availability-dates.mock';
import { getMockAvailableTimes } from './mock/availability-times.mock';
import { getMockAvailableAreas } from './mock/availability-areas.mock';
import { getMockHold } from './mock/hold.mock';
import { getMockConfirm } from './mock/confirm.mock';

@Injectable()
export class RezervemHttpService {
  private readonly logger = new Logger(RezervemHttpService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: RezervemAuthService,
  ) {}

  private get isMock(): boolean {
    return this.configService.get<string>('USE_MOCK_REZERVEM') === 'true';
  }

  private get baseUrl(): string {
    return this.configService.get<string>('REZERVEM_BASE_URL');
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.authService.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`GET ${path} failed: ${response.status} ${text}`);
      throw new Error(`Rezervem API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(path: string, body: object): Promise<T> {
    const token = await this.authService.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`POST ${path} failed: ${response.status} ${text}`);
      throw new Error(`Rezervem API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // --- Venues ---

  async getVenues(): Promise<object> {
    if (this.isMock) {
      this.logger.debug('[MOCK] getVenues');
      return { venues: MOCK_VENUES };
    }
    return this.get('/v1/venues');
  }

  // --- Bootstrap ---

  async getBootstrap(slug: string): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getBootstrap: ${slug}`);
      const data = getMockBootstrap(slug);
      if (!data) throw new Error(`Mock venue not found: ${slug}`);
      return data;
    }
    return this.get(`/v1/venues/${slug}/bootstrap`);
  }

  // --- Availability: Dates ---

  async getAvailableDates(slug: string, pax: number): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableDates: ${slug} pax=${pax}`);
      return getMockAvailableDates(slug, pax);
    }
    return this.get(`/v1/venues/${slug}/availability/dates?pax=${pax}`);
  }

  // --- Availability: Times ---

  async getAvailableTimes(slug: string, pax: number, date: string): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableTimes: ${slug} pax=${pax} date=${date}`);
      return getMockAvailableTimes(slug, pax, date);
    }
    return this.get(`/v1/venues/${slug}/availability/times?pax=${pax}&date=${date}`);
  }

  // --- Availability: Areas ---

  async getAvailableAreas(slug: string, pax: number, date: string, time: string): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableAreas: ${slug} pax=${pax} date=${date} time=${time}`);
      return getMockAvailableAreas(slug, pax, date, time);
    }
    return this.get(`/v1/venues/${slug}/availability/areas?pax=${pax}&date=${date}&time=${encodeURIComponent(time)}`);
  }

  // --- Hold ---

  async holdSlot(params: {
    slug: string;
    pax: number;
    date: string;
    time: string;
    areaId: string;
  }): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] holdSlot: ${JSON.stringify(params)}`);
      return getMockHold(params);
    }
    return this.post(`/v1/venues/${params.slug}/hold`, {
      pax: params.pax,
      date: params.date,
      time: params.time,
      areaId: params.areaId,
    });
  }

  // --- Confirm ---

  async confirmReservation(holdId: string, guestInfo: object): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] confirmReservation: holdId=${holdId}`);
      return getMockConfirm(holdId, guestInfo);
    }
    return this.post(`/v1/holds/${holdId}/confirm`, { guestInfo });
  }
}
