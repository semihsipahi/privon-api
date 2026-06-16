import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RezervemVenue } from '../../models/rezervem-venue.schema';
import { Restaurant } from '../../models/restaurant.schema';
import { RestaurantCategory } from '../../models/restaurant-category.schema';
import {
  RezervemHttpService,
  RezervemBootstrapResponse,
} from './rezervem-http.service';
import {
  mapVenueToCategory,
  deriveBadges,
  DEFAULT_FALLBACK_CATEGORY,
  SLUG_OVERRIDES,
} from './rezervem-category-mapper';
import { ImportRezervemVenueDto } from '../../dtos/import-rezervem-venue.dto';

const SHIFT_PERIODS: Record<
  number,
  Array<{ openingTime: string; closingTime: string }>
> = {
  0: [{ openingTime: '09:00', closingTime: '12:00' }], // Kahvaltı
  1: [{ openingTime: '12:00', closingTime: '16:00' }], // Öğle
  2: [{ openingTime: '18:00', closingTime: '23:00' }], // Akşam
  3: [{ openingTime: '20:00', closingTime: '02:00' }], // Bar
};

const DAY_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

/**
 * Rezervem shifts alanı iki farklı format dönebilir:
 *   - Array  : [1, 2] (bazı endpointler)
 *   - Object : { breakfast: false, lunch: true, dinner: true, bar: false }
 * Her ikisini de 0=Kahvaltı, 1=Öğle, 2=Akşam, 3=Bar sayı dizisine normalize eder.
 */
function normalizeShifts(raw: any): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => !isNaN(n));
  if (typeof raw === 'object') {
    const result: number[] = [];
    if (raw.breakfast) result.push(0);
    if (raw.lunch) result.push(1);
    if (raw.dinner) result.push(2);
    if (raw.bar) result.push(3);
    return result;
  }
  return [];
}

function buildWorkingHoursFromShifts(
  areas: Array<{ shifts?: number[] }>,
): Array<{
  dayName: string;
  periods: Array<{ openingTime: string; closingTime: string }>;
  isClosed: boolean;
}> {
  const allShifts = new Set<number>();
  for (const area of areas) {
    for (const s of area.shifts ?? []) allShifts.add(Number(s));
  }
  if (allShifts.size === 0) return [];

  const periods = Array.from(allShifts)
    .sort()
    .flatMap((s) => SHIFT_PERIODS[s] ?? []);

  return DAY_NAMES.map((dayName) => ({ dayName, periods, isClosed: false }));
}

export interface SyncReport {
  startedAt: Date;
  finishedAt: Date;
  venuesTotal: number;
  succeeded: number;
  failed: number;
  errors: { slug: string; error: string }[];
}

@Injectable()
export class RezervemVenueService implements OnModuleInit {
  private readonly logger = new Logger(RezervemVenueService.name);
  private syncing = false;

  constructor(
    @InjectModel(RezervemVenue.name)
    private readonly model: Model<RezervemVenue>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel(RestaurantCategory.name)
    private readonly categoryModel: Model<RestaurantCategory>,
    private readonly http: RezervemHttpService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // Sadece rezervem moddaysa ve cache boşsa ilk syncʼi tetikle.
    const source = this.config.get<string>('RESTAURANT_SOURCE');
    if (source !== 'rezervem') {
      this.logger.log('RESTAURANT_SOURCE != rezervem — initial sync skipped');
      return;
    }
    const count = await this.model.estimatedDocumentCount();
    if (count === 0) {
      this.logger.log(
        'rezervem_venues collection empty — running initial sync',
      );
      this.syncAll().catch((err) =>
        this.logger.error(`Initial sync failed: ${err?.message ?? err}`),
      );
    } else {
      this.logger.log(
        `rezervem_venues already populated (${count} docs) — skipping initial sync`,
      );
    }
  }

  // Her 6 saatte bir resync
  @Cron(CronExpression.EVERY_6_HOURS)
  async cronSync() {
    if (this.config.get<string>('RESTAURANT_SOURCE') !== 'rezervem') return;
    this.logger.log('Cron-triggered Rezervem sync');
    try {
      await this.syncAll();
    } catch (err: any) {
      this.logger.error(`Cron sync failed: ${err?.message ?? err}`);
    }
  }

  async syncAll(): Promise<SyncReport> {
    if (this.syncing) {
      this.logger.warn('Sync already in progress — ignoring concurrent call');
      throw new Error('Sync already in progress');
    }
    this.syncing = true;

    const report: SyncReport = {
      startedAt: new Date(),
      finishedAt: null as any,
      venuesTotal: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 1) Liste çek (sayfa sayfa)
      // List response'undaki name'i de yakala — bootstrap'ta displayName boş
      // gelirse kullanırız (test ortamı şu an böyle davranıyor).
      const listEntries: {
        slug: string;
        name: string;
        categoryKey?: string;
      }[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const list = await this.http.getVenues(page, pageSize);
        for (const v of list.items) {
          if (v.isActive)
            listEntries.push({
              slug: v.slug,
              name: v.name,
              categoryKey: v.categoryKey,
            });
        }
        if (list.items.length < pageSize) break;
        page += 1;
        if (page > 50) break; // safety net
      }
      const allSlugs = listEntries.map((e) => e.slug);
      const nameBySlug = new Map(listEntries.map((e) => [e.slug, e.name]));
      const categoryBySlug = new Map(
        listEntries.map((e) => [e.slug, e.categoryKey]),
      );
      report.venuesTotal = allSlugs.length;
      this.logger.log(`Fetched ${allSlugs.length} active venues from Rezervem`);

      // 2) Bootstrap'ları paralel (concurrency 5) çek
      const fallback =
        this.config.get<string>('REZERVEM_FALLBACK_CATEGORY') ||
        DEFAULT_FALLBACK_CATEGORY;

      const queue = [...allSlugs];
      const workers = Array.from({ length: 5 }).map(async () => {
        while (queue.length) {
          const slug = queue.shift();
          if (!slug) break;
          const listName = nameBySlug.get(slug) ?? slug;
          try {
            const boot = await this.http.getBootstrap(slug);
            const listCategoryKey = categoryBySlug.get(slug);
            const existing = await this.model
              .findOne({ slug })
              .select('adminExcluded')
              .lean();
            if ((existing as any)?.adminExcluded) {
              this.logger.log(
                `[Rezervem] sync skip (adminExcluded) slug=${slug}`,
              );
              report.succeeded += 1;
              continue;
            }
            await this.upsertFromBootstrap(
              slug,
              listName,
              boot,
              fallback,
              listCategoryKey,
            );
            report.succeeded += 1;
          } catch (err: any) {
            report.failed += 1;
            report.errors.push({ slug, error: err?.message ?? String(err) });
            // Mevcut kayda hata yaz, ama silme
            await this.model.updateOne(
              { slug },
              {
                $set: {
                  lastSyncError: err?.message ?? String(err),
                  lastSyncedAt: new Date(),
                },
              },
              { upsert: false },
            );
            this.logger.warn(
              `Bootstrap failed for ${slug}: ${err?.message ?? err}`,
            );
          }
        }
      });
      await Promise.all(workers);

      // 3) Rezervem'de artık olmayan venue'ları pasifleştir
      await this.model.updateMany(
        { slug: { $nin: allSlugs } },
        { $set: { isActive: false } },
      );

      // 4) Slug override'larını collection'daki tüm dökümanlara uygula —
      //    venue Rezervem'de aktif olmasa bile kategori doğru kalmalı.
      await Promise.all(
        Object.entries(SLUG_OVERRIDES).map(([s, cat]) =>
          this.model.updateOne(
            { slug: s },
            { $set: { categoryKey: cat, categoryScore: 1000 } },
          ),
        ),
      );

      // 5) Kaldırılan kategorileri fallback'e taşı — bootstrap hatası nedeniyle
      //    eski categoryKey değeri kalan dokümanları temizler.
      await this.model.updateMany(
        {
          categoryKey: {
            $nin: ['Michelin Guide', 'Chef Restaurants', 'City Classics'],
          },
        },
        { $set: { categoryKey: fallback } },
      );

      report.finishedAt = new Date();
      this.logger.log(
        `Sync done: ${report.succeeded} ok / ${report.failed} fail / ${report.venuesTotal} total ` +
          `in ${(report.finishedAt.getTime() - report.startedAt.getTime()) / 1000}s`,
      );
      return report;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Rezervem i18n alanları string yerine { tr, en } objesi olarak dönüyor.
   * Bu helper TR'yi öncelikli, EN'i fallback olarak alır; zaten string ise
   * olduğu gibi döner.
   */
  private i18n(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.tr || value.en || '';
    return '';
  }

  /** Rezervem address: { fullAddress: { tr, en } } | string */
  private resolveAddress(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value.fullAddress) return this.i18n(value.fullAddress);
      return this.i18n(value);
    }
    return '';
  }

  /** Rezervem contact: { phone, email, website } | string */
  private resolveContactPhone(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object')
      return value.phone || value.email || value.website || '';
    return '';
  }

  private async upsertFromBootstrap(
    slug: string,
    listName: string,
    boot: RezervemBootstrapResponse,
    fallback: string,
    listCategoryKey?: string,
  ): Promise<void> {
    const venueInfo: any = boot.venue ?? {};
    const areas = (boot.areas ?? []) as any[];
    const tags = (boot.tags ?? []) as any[];

    // İsim önceliği: bootstrap.displayName (i18n) > /v1/venues.name > slug
    const displayNameStr = this.i18n(venueInfo.displayName);
    const resolvedName: string = displayNameStr || listName || slug;

    // Tag'leri i18n'den arındırılmış {title, summary} listesine düşür
    const normalizedTags = tags.map((t) => ({
      id: t.id,
      title: this.i18n(t.title),
      summary: this.i18n(t.summary),
    }));

    // Area'ları normalize et
    const normalizedAreas = areas.map((a) => ({
      id: a.id,
      title: this.i18n(a.title),
      summary: this.i18n(a.summary),
      minCapacity: a.minCapacity,
      maxCapacity: a.maxCapacity,
      shifts: normalizeShifts(a.shifts),
      photos: Array.isArray(a.photos) ? a.photos : [],
      coverPhoto: a.coverPhoto || '',
      hasTastingMenu: !!a.hasTastingMenu,
    }));

    // Rezervem'in kendi categoryKey'i (örn. "Michelin Guide") bizdeki kategori
    // isimleriyle birebir örtüşüyorsa doğrudan kullan; yoksa keyword heuristic devreye girer.
    const KNOWN_CATEGORIES = new Set([
      'Michelin Guide',
      'Chef Restaurants',
      'City Classics',
    ]);
    const mapping =
      listCategoryKey && KNOWN_CATEGORIES.has(listCategoryKey)
        ? {
            categoryKey: listCategoryKey,
            score: 500,
            matchedKeywords: ['__rezervem_categoryKey__'],
          }
        : mapVenueToCategory(
            {
              slug,
              name: resolvedName,
              displayName: displayNameStr,
              tags: normalizedTags.map((t) => ({
                title: t.title,
                summary: t.summary,
              })),
              hasTastingMenu: normalizedAreas.some((a) => a.hasTastingMenu),
              areaTitles: normalizedAreas.map((a) => a.title),
            },
            fallback,
          );

    const badges = deriveBadges({
      slug,
      name: resolvedName,
      displayName: displayNameStr,
      tags: normalizedTags.map((t) => ({ title: t.title })),
      hasTastingMenu: normalizedAreas.some((a) => a.hasTastingMenu),
      areaTitles: normalizedAreas.map((a) => a.title),
    });

    // Cover photo: ilk salonun coverPhoto'su, yoksa ilk photo, yoksa logoUrl
    const coverPhoto =
      normalizedAreas.find((a) => !!a.coverPhoto)?.coverPhoto ||
      normalizedAreas.flatMap((a) => a.photos)[0] ||
      venueInfo.logoUrl ||
      '';

    const photos = Array.from(
      new Set(
        [
          coverPhoto,
          ...normalizedAreas.flatMap((a) => a.photos),
          ...(venueInfo.logoUrl ? [venueInfo.logoUrl] : []),
        ].filter(Boolean),
      ),
    );

    // Derive areaRequired from bookingFlow.steps (step named 'area' means area selection is required)
    const flowSteps: any[] = boot.bookingFlow?.steps ?? [];
    const areaRequired = flowSteps.some((s: any) =>
      typeof s === 'string' ? s === 'area' : s?.type === 'area',
    );

    await this.model.updateOne(
      { slug },
      {
        $set: {
          slug,
          name: resolvedName,
          displayName: displayNameStr,
          logoUrl: venueInfo.logoUrl || '',
          coverPhoto,
          photos,
          address: this.resolveAddress(venueInfo.address),
          contact: this.resolveContactPhone(venueInfo.contact),
          timezone: venueInfo.timezone,
          currency: (venueInfo.currency || '').trim(),
          supportedLanguages: venueInfo.supportedLanguages ?? [],
          pax: boot.pax ?? undefined,
          bookingFlow: boot.bookingFlow
            ? { ...boot.bookingFlow, areaRequired }
            : undefined,
          leadTimes: boot.leadTimes ?? undefined,
          genderPolicy: boot.genderPolicy ?? undefined,
          groupBooking: boot.groupBooking ?? undefined,
          paymentPreview: boot.paymentPreview ?? undefined,
          tastingMenu: boot.tastingMenu ?? undefined,
          uiHints: boot.uiHints ?? undefined,
          policies: boot.policies ?? undefined,
          areas: normalizedAreas,
          tags: normalizedTags,
          workingHours: Array.isArray(venueInfo.workingHours)
            ? venueInfo.workingHours
            : buildWorkingHoursFromShifts(normalizedAreas),
          categoryKey: mapping.categoryKey,
          categoryScore: mapping.score,
          badges,
          hasTastingMenu: normalizedAreas.some((a) => a.hasTastingMenu),
          isActive: true,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      },
      { upsert: true },
    );
  }

  // ── Query helpers ─────────────────────────────────────────────────

  async setAdminExcluded(slug: string, excluded: boolean): Promise<void> {
    await this.model.updateOne(
      { slug },
      { $set: { adminExcluded: excluded, isActive: !excluded } },
    );
    this.logger.log(
      `[RezervemVenue] adminExcluded=${excluded} set for slug=${slug}`,
    );
  }

  findActiveByCategoryKey(categoryKey: string, limit: number, skip: number) {
    return this.model
      .find({ isActive: true, adminExcluded: { $ne: true }, categoryKey })
      .sort({ categoryScore: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  countActiveByCategoryKey(categoryKey: string) {
    return this.model.countDocuments({
      isActive: true,
      adminExcluded: { $ne: true },
      categoryKey,
    });
  }

  findActive(limit: number, skip: number, q?: string) {
    const filter: any = { isActive: true, adminExcluded: { $ne: true } };
    if (q && q.trim()) filter.name = { $regex: q.trim(), $options: 'i' };
    return this.model
      .find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  countActive(q?: string) {
    const filter: any = { isActive: true, adminExcluded: { $ne: true } };
    if (q && q.trim()) filter.name = { $regex: q.trim(), $options: 'i' };
    return this.model.countDocuments(filter);
  }

  findBySlug(slug: string) {
    return this.model.findOne({ slug }).lean();
  }

  async getStatus() {
    const [total, active, lastDoc] = await Promise.all([
      this.model.estimatedDocumentCount(),
      this.model.countDocuments({ isActive: true }),
      this.model
        .findOne({})
        .sort({ lastSyncedAt: -1 })
        .select('lastSyncedAt')
        .lean(),
    ]);
    return {
      totalDocs: total,
      activeDocs: active,
      lastSyncedAt: (lastDoc as any)?.lastSyncedAt ?? null,
      syncing: this.syncing,
    };
  }

  // ── Admin: liste + detay ──────────────────────────────────────────

  async listForAdmin(params: {
    page: number;
    pageSize: number;
    q?: string;
    categoryKey?: string;
  }): Promise<{ data: any[]; total: number }> {
    const filter: Record<string, any> = {};
    if (params.q?.trim())
      filter.name = { $regex: params.q.trim(), $options: 'i' };
    if (params.categoryKey?.trim())
      filter.categoryKey = params.categoryKey.trim();

    const skip = (params.page - 1) * params.pageSize;
    const [venues, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ categoryScore: -1, name: 1 })
        .skip(skip)
        .limit(params.pageSize)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    // İçe aktarılan mekanları işaretle — tek sorguda
    const slugs = venues.map((v) => v.slug);
    const importedSlugs = new Set(
      await this.restaurantModel
        .find({ rezervemSlug: { $in: slugs } })
        .distinct('rezervemSlug'),
    );

    const data = venues.map((v) => ({
      ...v,
      isImported: importedSlugs.has(v.slug),
    }));

    return { data, total };
  }

  async getBySlugForAdmin(slug: string): Promise<any> {
    const venue = await this.model.findOne({ slug }).lean();
    if (!venue) throw new NotFoundException(`Venue bulunamadı: ${slug}`);

    const restaurant = await this.restaurantModel
      .findOne({ rezervemSlug: slug })
      .select('_id isActive')
      .lean();

    return {
      ...venue,
      isImported: !!restaurant,
      importedRestaurantId: restaurant ? String((restaurant as any)._id) : null,
      importedIsActive: (restaurant as any)?.isActive ?? null,
    };
  }

  // ── Admin: import ─────────────────────────────────────────────────

  async importToRestaurant(
    slug: string,
    adminUserId: string,
    dto: ImportRezervemVenueDto,
  ): Promise<{ restaurantId: string; created: boolean }> {
    const venue = await this.model.findOne({ slug }).lean();
    if (!venue)
      throw new NotFoundException(`Venue cache'de bulunamadı: ${slug}`);

    // Kategori ObjectId'lerini doğrula
    const categoryObjectIds = dto.categoryIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (categoryObjectIds.length === 0) {
      const category = await this.categoryModel
        .findOne({ name: venue.categoryKey })
        .lean();
      if (category) categoryObjectIds.push((category as any)._id);
    }

    // Temel restaurant verisi
    const restaurantBase: Record<string, any> = {
      name: dto.name?.trim() || venue.name,
      images: dto.images ?? [],
      categories: categoryObjectIds,
      priceLevel: dto.priceLevel,
      location: {
        type: 'Point',
        coordinates: [0, 0],
        address: venue.address ?? '',
        city: dto.city ?? '',
        district: dto.district ?? '',
      },
      description: dto.description ?? '',
      descriptionEng: dto.descriptionEng ?? '',
      phone: dto.phone || venue.contact || undefined,
      email: dto.email || undefined,
      website: dto.website || undefined,
      instagramUrl: dto.instagramUrl || undefined,
      awards: dto.awards?.length
        ? dto.awards.map((a) => ({
            iconUrl: a.iconUrl,
            name: a.name || 'Michelin Rehberi',
            year: a.year ?? new Date().getFullYear(),
          }))
        : venue.badges?.length
          ? venue.badges.map((b) => ({
              iconUrl: '',
              name: b,
              year: new Date().getFullYear(),
            }))
          : [],
      cuisineTypes:
        dto.cuisineTypes ??
        (venue.tags ?? []).map((t) => t.title).filter(Boolean),

      atmosphereTypes: [],
      workingHours:
        dto.workingHours && dto.workingHours.length > 0
          ? dto.workingHours
          : (venue as any).workingHours?.length > 0
            ? (venue as any).workingHours
            : buildWorkingHoursFromShifts(
                (venue.areas ?? []).map((a: any) => ({
                  shifts: normalizeShifts(a.shifts),
                })),
              ),
      rezervemSlug: venue.slug,
    };

    const existing = await this.restaurantModel
      .findOne({ rezervemSlug: slug })
      .lean();

    if (existing) {
      await this.restaurantModel.updateOne(
        { rezervemSlug: slug },
        { $set: { ...restaurantBase, isActive: true } },
      );
      return { restaurantId: String((existing as any)._id), created: false };
    }

    const created = await this.restaurantModel.create({
      ...restaurantBase,
      owner: new Types.ObjectId(adminUserId),
      isActive: true,
      rating: 0,
      reviewCount: 0,
    });
    return { restaurantId: String(created._id), created: true };
  }
}
