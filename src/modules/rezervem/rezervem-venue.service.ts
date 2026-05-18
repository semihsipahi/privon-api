import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RezervemVenue } from '../../models/rezervem-venue.schema';
import { RezervemHttpService, RezervemBootstrapResponse } from './rezervem-http.service';
import { mapVenueToCategory, deriveBadges, DEFAULT_FALLBACK_CATEGORY } from './rezervem-category-mapper';

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
      this.logger.log('rezervem_venues collection empty — running initial sync');
      this.syncAll().catch((err) =>
        this.logger.error(`Initial sync failed: ${err?.message ?? err}`),
      );
    } else {
      this.logger.log(`rezervem_venues already populated (${count} docs) — skipping initial sync`);
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
      const listEntries: { slug: string; name: string }[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const list = await this.http.getVenues(page, pageSize);
        for (const v of list.items) {
          if (v.isActive) listEntries.push({ slug: v.slug, name: v.name });
        }
        if (list.items.length < pageSize) break;
        page += 1;
        if (page > 50) break; // safety net
      }
      const allSlugs = listEntries.map((e) => e.slug);
      const nameBySlug = new Map(listEntries.map((e) => [e.slug, e.name]));
      report.venuesTotal = allSlugs.length;
      this.logger.log(`Fetched ${allSlugs.length} active venues from Rezervem`);

      // 2) Bootstrap'ları paralel (concurrency 5) çek
      const fallback =
        this.config.get<string>('REZERVEM_FALLBACK_CATEGORY') || DEFAULT_FALLBACK_CATEGORY;

      const queue = [...allSlugs];
      const workers = Array.from({ length: 5 }).map(async () => {
        while (queue.length) {
          const slug = queue.shift();
          if (!slug) break;
          const listName = nameBySlug.get(slug) ?? slug;
          try {
            const boot = await this.http.getBootstrap(slug);
            await this.upsertFromBootstrap(slug, listName, boot, fallback);
            report.succeeded += 1;
          } catch (err: any) {
            report.failed += 1;
            report.errors.push({ slug, error: err?.message ?? String(err) });
            // Mevcut kayda hata yaz, ama silme
            await this.model.updateOne(
              { slug },
              { $set: { lastSyncError: err?.message ?? String(err), lastSyncedAt: new Date() } },
              { upsert: false },
            );
            this.logger.warn(`Bootstrap failed for ${slug}: ${err?.message ?? err}`);
          }
        }
      });
      await Promise.all(workers);

      // 3) Rezervem'de artık olmayan venue'ları pasifleştir
      await this.model.updateMany(
        { slug: { $nin: allSlugs } },
        { $set: { isActive: false } },
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
    if (typeof value === 'object') return value.phone || value.email || value.website || '';
    return '';
  }

  private async upsertFromBootstrap(
    slug: string,
    listName: string,
    boot: RezervemBootstrapResponse,
    fallback: string,
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
      shifts: a.shifts,
      photos: Array.isArray(a.photos) ? a.photos : [],
      coverPhoto: a.coverPhoto || '',
      hasTastingMenu: !!a.hasTastingMenu,
    }));

    const mapping = mapVenueToCategory(
      {
        slug,
        name: resolvedName,
        displayName: displayNameStr,
        tags: normalizedTags.map((t) => ({ title: t.title, summary: t.summary })),
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
          bookingFlow: boot.bookingFlow ?? undefined,
          areas: normalizedAreas,
          tags: normalizedTags,
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

  findActiveByCategoryKey(categoryKey: string, limit: number, skip: number) {
    return this.model
      .find({ isActive: true, categoryKey })
      .sort({ categoryScore: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  countActiveByCategoryKey(categoryKey: string) {
    return this.model.countDocuments({ isActive: true, categoryKey });
  }

  findActive(limit: number, skip: number, q?: string) {
    const filter: any = { isActive: true };
    if (q && q.trim()) filter.name = { $regex: q.trim(), $options: 'i' };
    return this.model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean();
  }

  countActive(q?: string) {
    const filter: any = { isActive: true };
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
      this.model.findOne({}).sort({ lastSyncedAt: -1 }).select('lastSyncedAt').lean(),
    ]);
    return {
      totalDocs: total,
      activeDocs: active,
      lastSyncedAt: (lastDoc as any)?.lastSyncedAt ?? null,
      syncing: this.syncing,
    };
  }
}
