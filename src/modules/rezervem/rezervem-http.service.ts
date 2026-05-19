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
  items: { slug: string; name: string; isActive: boolean; categoryKey?: string }[];
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

  // --- Image proxy ---

  /**
   * CDN görselini sunucu üzerinden çeker. Bearer token + Referer ekler.
   * Admin paneli <img> tag'leri auth header gönderemez; bu endpoint ile
   * tarayıcı doğrudan bizim API'mıza istek atar, biz CDN'e güvenli erişim sağlarız.
   */
  async fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const ALLOWED_HOSTS = [
      'media.rezervem.com.tr',
      'cdn.rezervem.com.tr',
      'rezervem.com.tr',
      'storage.rezervem.com.tr',
      'images.rezervem.com.tr',
      'rezervem-cdn.azureedge.net',
      'rezervem-cdn.azurefd.net',
    ];

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Geçersiz URL');
    }

    if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      throw new Error(`İzin verilmeyen CDN host: ${parsed.hostname}`);
    }

    let token = '';
    try {
      token = await this.authService.getAccessToken();
    } catch {
      // Token alınamazsa auth header olmadan dene
    }

    const headers: Record<string, string> = {
      Referer: 'https://rezervem.com.tr',
      'User-Agent': 'Mozilla/5.0 (compatible; Privon/1.0)',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CDN ${response.status} for ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
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

  // --- i18n helper ---

  private i18n(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v.tr || v.en || '';
  }

  // --- Response transformers (real Rezervem API → mobile contract) ---

  private transformDatesResponse(raw: any, slug: string, pax: number): object {
    if (Array.isArray(raw?.availableDates)) return raw;
    if (Array.isArray(raw?.dates)) {
      const availableDates: string[] = raw.dates
        .filter((d: any) => d.status === 'AVAILABLE' || d.status === 'LIMITED')
        .map((d: any) => d.date);
      return { slug, pax, availableDates };
    }
    this.logger.warn(`[Rezervem] unexpected dates response: ${JSON.stringify(raw)?.slice(0, 200)}`);
    return { slug, pax, availableDates: [] };
  }

  private transformTimesResponse(raw: any, slug: string, pax: number, date: string): object {
    if (Array.isArray(raw?.slots)) return raw;
    if (Array.isArray(raw?.shifts)) {
      const slots: { time: string; available: boolean }[] = [];
      for (const shift of raw.shifts) {
        for (const t of shift.times ?? []) {
          const available = t.status === 'AVAILABLE' || t.status === 'LIMITED';
          slots.push({ time: t.time ?? t.displayTime, available });
        }
      }
      this.logger.log(`[Rezervem] transformTimes: ${slots.length} slots from ${raw.shifts.length} shifts`);
      return { slug, pax, date, slots };
    }
    // Direct array of time slots
    if (Array.isArray(raw)) {
      const slots = raw.map((t: any) => ({
        time: t.time ?? t.displayTime,
        available: t.status === 'AVAILABLE' || t.status === 'LIMITED' || t.available === true,
      }));
      return { slug, pax, date, slots };
    }
    this.logger.warn(`[Rezervem] unexpected times response keys=${Object.keys(raw ?? {}).join(',')}: ${JSON.stringify(raw)?.slice(0, 300)}`);
    return { slug, pax, date, slots: [] };
  }

  private transformAreasResponse(raw: any, slug: string, pax: number, date: string, time: string): object {
    if (Array.isArray(raw?.areas) && raw.areas[0]?.name !== undefined) return raw;

    // Determine areas array from various possible Rezervem response structures
    let areasArr: any[] | null = null;
    if (Array.isArray(raw?.areas)) areasArr = raw.areas;
    else if (Array.isArray(raw?.rooms)) areasArr = raw.rooms;
    else if (Array.isArray(raw?.data)) areasArr = raw.data;
    else if (Array.isArray(raw)) areasArr = raw;

    if (areasArr !== null) {
      this.logger.log(`[Rezervem] transformAreas: ${areasArr.length} areas raw keys=${Object.keys(areasArr[0] ?? {}).join(',')}`);
      const areas = areasArr.map((a: any) => ({
        id: String(a.id),
        name: this.i18n(a.title ?? a.name),
        description: this.i18n(a.summary ?? a.description),
        minPax: a.minCapacity ?? a.minPax ?? 1,
        maxPax: a.maxCapacity ?? a.maxPax ?? 10,
        available: a.selectable !== false && a.available !== false && a.status !== 'FULL' && a.status !== 'BLOCKED',
        imageUrl: a.coverPhoto ?? a.imageUrl ?? (Array.isArray(a.photos) ? a.photos[0] : undefined),
      }));
      return { slug, pax, date, time, areas };
    }

    this.logger.warn(`[Rezervem] unexpected areas response keys=${Object.keys(raw ?? {}).join(',')}: ${JSON.stringify(raw)?.slice(0, 300)}`);
    return { slug, pax, date, time, areas: [] };
  }

  private transformHoldResponse(
    raw: any,
    params: { slug: string; pax: number; date: string; time: string; areaId?: string },
  ): object {
    if (raw?.holdId && !raw?.sessionId) return raw;
    const sessionId: string | undefined = raw?.sessionId;
    if (sessionId) {
      const holdId = `${params.slug}::${sessionId}`;
      const expiresAt: string = raw.expiresOn ?? new Date(Date.now() + 600_000).toISOString();
      return {
        holdId,
        slug: params.slug,
        pax: params.pax,
        date: params.date,
        time: params.time,
        areaId: params.areaId ?? String(raw.roomId ?? ''),
        status: raw.status ?? 'held',
        expiresAt,
        ttlSeconds: Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
        paymentScenario: 'A',
      };
    }
    this.logger.warn(`[Rezervem] unexpected hold response: ${JSON.stringify(raw)?.slice(0, 200)}`);
    return raw;
  }

  private transformConfirmResponse(raw: any, holdId: string): object {
    if (raw?.confirmationCode && !raw?.sessionId) return raw;
    return {
      reservationId: raw?.reservationId ?? raw?.sessionId ?? holdId,
      holdId,
      status: raw?.status ?? 'confirmed',
      confirmedAt: raw?.confirmedAt ?? raw?.createdAt ?? new Date().toISOString(),
      confirmationCode: raw?.confirmationCode ?? raw?.reservationCode ?? `PRV${Date.now().toString().slice(-6)}`,
      message: raw?.message ?? 'Rezervasyonunuz başarıyla oluşturulmuştur.',
    };
  }

  // --- Availability: Dates ---

  async getAvailableDates(slug: string, pax: number): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableDates: ${slug} pax=${pax}`);
      return getMockAvailableDates(slug, pax);
    }
    const raw = await this.get(`/v1/venues/${slug}/availability/dates?partySize=${pax}`);
    return this.transformDatesResponse(raw, slug, pax);
  }

  // --- Availability: Times ---

  async getAvailableTimes(slug: string, pax: number, date: string): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] getAvailableTimes: ${slug} pax=${pax} date=${date}`);
      return getMockAvailableTimes(slug, pax, date);
    }
    const raw = await this.get(`/v1/venues/${slug}/availability/times?partySize=${pax}&date=${date}`);
    return this.transformTimesResponse(raw, slug, pax, date);
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
    const raw = await this.get(`/v1/venues/${slug}/availability/areas?${qs}`);
    return this.transformAreasResponse(raw, slug, pax, date, time);
  }

  // --- Hold (Checkout) ---

  async holdSlot(params: {
    slug: string;
    pax: number;
    date: string;
    time: string;
    shift: number;
    areaId?: string;
    roomId?: number;
    paymentMode?: 'immediate' | 'deferred';
  }): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] holdSlot: ${JSON.stringify(params)}`);
      const areaId = params.areaId ?? String(params.roomId ?? '');
      return getMockHold({ ...params, areaId });
    }
    const raw = await this.post(`/v1/venues/${params.slug}/checkout/hold`, {
      date: params.date,
      time: params.time,
      pax: params.pax,
      shift: params.shift,
      roomId: params.roomId ?? (params.areaId ? (parseInt(params.areaId, 10) || undefined) : undefined),
      paymentMode: params.paymentMode ?? 'immediate',
    });
    return this.transformHoldResponse(raw, params);
  }

  // --- Confirm Hold (Mobile-compatible) ---
  // holdId format: "${slug}::${sessionId}" (encoded during hold) or mock holdId

  async confirmHold(
    holdId: string,
    guestInfo: { firstName: string; lastName: string; phone: string; email?: string; note?: string },
  ): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] confirmHold: holdId=${holdId}`);
      return getMockConfirm(holdId, guestInfo);
    }

    if (!holdId.includes('::')) {
      throw new Error('Geçersiz rezervasyon oturumu. Lütfen tekrar deneyin.');
    }
    const sepIdx = holdId.indexOf('::');
    const slug = holdId.slice(0, sepIdx);
    const sessionId = holdId.slice(sepIdx + 2);

    let phone = (guestInfo.phone ?? '').replace(/\s/g, '');
    if (phone.startsWith('+90')) phone = phone.slice(3);
    else if (phone.startsWith('90') && phone.length === 12) phone = phone.slice(2);
    if (phone.startsWith('0')) phone = phone.slice(1);

    const model = {
      client: {
        firstName: guestInfo.firstName,
        lastName: guestInfo.lastName,
        phoneNumberCountryCode: '90',
        phoneNumber: phone,
        emailAddress: guestInfo.email ?? '',
      },
      femaleCount: 0,
      note: guestInfo.note ?? '',
      hasCakeDelivery: false,
      hasFlowerDelivery: false,
      needInvoice: false,
    };

    this.logger.log(`[Rezervem] confirmHold slug=${slug} sessionId=${sessionId}`);
    const raw = await this.post(`/v1/venues/${slug}/checkout/confirm?responseMode=v1`, { sessionId, model });
    return this.transformConfirmResponse(raw, holdId);
  }

  // --- Confirm (Checkout) ---

  async confirmReservation(slug: string, sessionId: string, model: any): Promise<object> {
    if (this.isMock) {
      this.logger.debug(`[MOCK] confirmReservation: sessionId=${sessionId}`);
      return getMockConfirm(sessionId, model);
    }
    return this.post(`/v1/venues/${slug}/checkout/confirm?responseMode=v1`, { sessionId, model });
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
