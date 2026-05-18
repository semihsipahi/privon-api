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

export interface RezervemVenueListResponse {
  items: { slug: string; name: string; isActive: boolean }[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Rezervem real payload: i18n field'lar { tr, en } objesi olabilir, string olabilir.
type I18n = string | { tr?: string; en?: string } | null | undefined;

export interface RezervemBootstrapResponse {
  venue: {
    slug: string;
    displayName?: I18n;
    logoUrl?: string;
    theme?: any;
    address?:
      | { fullAddress?: I18n; [k: string]: any }
      | string
      | null;
    contact?:
      | { phone?: string; email?: string; website?: string }
      | string
      | null;
    timezone?: string;
    currency?: string;
    supportedLanguages?: string[];
    workingHours?: any;
  } | null;
  pax?: { min: number; max: number; step: number } | null;
  leadTimes?: { minDays: number; maxDays: number } | null;
  bookingFlow?: any;
  areas?: Array<{
    id: number;
    title?: I18n;
    summary?: I18n;
    minCapacity: number;
    maxCapacity: number;
    shifts?: any;
    photos?: string[];
    coverPhoto?: string;
    hasTastingMenu?: boolean;
  }> | null;
  tags?: Array<{ id: number; title?: I18n; summary?: I18n }> | null;
}

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
      throw new Error(`Rezervem API error: ${response.status} on ${path}`);
    }

    return this.unwrap<T>(await response.json(), path);
  }

  /**
   * Rezervem endpoint'leri tutarsız: bir kısmı doğrudan veri döndürür
   * (örn. /v1/venues → {items, totalCount, ...}), bir kısmı {header, result}
   * envelope'una sarar (örn. /v1/venues/{slug}/bootstrap). Bu helper:
   *  - envelope varsa header.hasError'a bakar, hata varsa fırlatır
   *  - result varsa onu, yoksa raw response'u döndürür
   */
  private unwrap<T>(raw: any, path: string): T {
    if (raw && typeof raw === 'object' && 'header' in raw) {
      const header = raw.header ?? {};
      if (header.hasError === true || header.result === false) {
        const msgs = Array.isArray(header.messages) ? header.messages.join(', ') : 'unknown';
        throw new Error(`Rezervem API error on ${path}: ${msgs}`);
      }
      return (raw.result ?? raw) as T;
    }
    return raw as T;
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
      throw new Error(`Rezervem API error: ${response.status} on ${path}`);
    }

    return this.unwrap<T>(await response.json(), path);
  }

  // --- Venues ---

  async getVenues(page = 1, pageSize = 100): Promise<RezervemVenueListResponse> {
    if (this.isMock) {
      this.logger.debug('[MOCK] getVenues');
      const items = MOCK_VENUES.map((v: any) => ({
        slug: v.slug,
        name: v.name,
        isActive: v.isActive ?? true,
      }));
      return { items, totalCount: items.length, page: 1, pageSize: items.length };
    }
    return this.get<RezervemVenueListResponse>(`/v1/venues?page=${page}&pageSize=${pageSize}`);
  }

  // --- Bootstrap ---

  async getBootstrap(slug: string): Promise<RezervemBootstrapResponse> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getBootstrap: ${slug}`);
      const data = getMockBootstrap(slug);
      if (!data) throw new Error(`Mock venue not found: ${slug}`);
      return data as RezervemBootstrapResponse;
    }
    return this.get<RezervemBootstrapResponse>(`/v1/venues/${slug}/bootstrap`);
  }

  // --- Availability: Dates ---

  async getAvailableDates(slug: string, pax: number): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableDates: ${slug} pax=${pax}`);
      return getMockAvailableDates(slug, pax);
    }
    return this.get(`/v1/venues/${slug}/availability/dates?partySize=${pax}`);
  }

  // --- Availability: Times ---

  async getAvailableTimes(slug: string, pax: number, date: string): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableTimes: ${slug} pax=${pax} date=${date}`);
      return getMockAvailableTimes(slug, pax, date);
    }
    return this.get(`/v1/venues/${slug}/availability/times?partySize=${pax}&date=${date}`);
  }

  // --- Availability: Areas ---

  async getAvailableAreas(
    slug: string,
    pax: number,
    date: string,
    time: string,
    shift: number,
  ): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableAreas: ${slug} pax=${pax} date=${date} time=${time}`);
      return getMockAvailableAreas(slug, pax, date, time);
    }
    const qs = `partySize=${pax}&date=${date}&time=${encodeURIComponent(time)}&shift=${shift}`;
    return this.get(`/v1/venues/${slug}/availability/areas?${qs}`);
  }

  // --- Hold (Checkout) ---

  async holdSlot(params: {
    slug: string;
    pax: number;
    date: string;
    time: string;
    shift: number;
    roomId?: number;
    paymentMode?: 'immediate' | 'deferred';
  }): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] holdSlot: ${JSON.stringify(params)}`);
      return getMockHold({ ...params, areaId: String(params.roomId ?? '') });
    }
    return this.post(`/v1/venues/${params.slug}/checkout/hold`, {
      date: params.date,
      time: params.time,
      pax: params.pax,
      shift: params.shift,
      roomId: params.roomId,
      paymentMode: params.paymentMode ?? 'immediate',
    });
  }

  // --- Confirm (Checkout) ---

  async confirmReservation(slug: string, sessionId: string, model: any): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] confirmReservation: sessionId=${sessionId}`);
      return getMockConfirm(sessionId, model);
    }
    return this.post(`/v1/venues/${slug}/checkout/confirm`, { sessionId, model });
  }

  // --- Finalize (Checkout) ---

  async finalizeReservation(
    slug: string,
    sessionId: string,
    paymentCompleted: boolean,
    model: any,
  ): Promise<object> {
    if (this.isMock) {
      return { sessionId, finalized: paymentCompleted };
    }
    return this.post(`/v1/venues/${slug}/checkout/finalize`, {
      sessionId,
      paymentCompleted,
      model,
    });
  }
}
