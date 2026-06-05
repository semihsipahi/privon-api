import { RezervemVenue } from '../../models/rezervem-venue.schema';
import { AwardDto, deriveAwards } from './rezervem-category-mapper';

/**
 * Rezervem cache dokümanını, mobil uygulamanın beklediği ApiRestaurant
 * shape'ine çevirir. Mobil tarafta types/restaurant.ts içinde ApiRestaurant
 * interface'i tanımlı — burada o sözleşmeyi koruyoruz.
 *
 * - _id  → slug (mobil tarafta detay sayfası id ile gelir; slug benzersizdir)
 * - image / images → coverPhoto + photos (bootstrap'tan derlenmiş)
 * - categories → [{ _id: <real Mongo Category id>, name: categoryKey }]
 * - rezervemSlug → slug
 *
 * Image fallback:
 *   REZERVEM_USE_PLACEHOLDER_IMAGES=true ise (veya cover URL boşsa)
 *   picsum.photos üzerinden slug-deterministic placeholder üretilir.
 *   Test ortamı CDN'i 404 dönüyor; prod'da flag kapatılır.
 */

function placeholderFor(slug: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/600`;
}

export function mapRezervemToApiRestaurant(
  venue: RezervemVenue & { _id?: any },
  category: { _id: string; name: string } | null,
  listView: boolean,
): any {
  const usePlaceholder = process.env.REZERVEM_USE_PLACEHOLDER_IMAGES === 'true';

  const photos = (venue.photos ?? []).filter(Boolean);
  const realCover = venue.coverPhoto || photos[0] || venue.logoUrl || '';
  const cover = usePlaceholder || !realCover ? placeholderFor(venue.slug) : realCover;

  const imagesOut = listView
    ? [cover]
    : photos.length
      ? usePlaceholder
        ? photos.map((_, i) => placeholderFor(`${venue.slug}-${i}`))
        : photos
      : [cover];

  const cuisineTypes: string[] = (venue.tags ?? [])
    .map((t) => t.title)
    .filter((t): t is string => !!t);

  return {
    _id: venue.slug,
    name: venue.name,
    image: cover,
    images: imagesOut,
    categories: category ? [{ _id: category._id, name: category.name }] : [],
    priceLevel: 3,
    location: {
      coordinates: [0, 0] as [number, number],
      address: venue.address ?? '',
    },
    workingHours: [],
    awards: venue.badges?.length
      ? venue.badges.map(badge => ({ iconUrl: '', name: badge, year: new Date().getFullYear() } as AwardDto))
      : deriveAwards({
          slug: venue.slug,
          name: venue.name,
          displayName: venue.displayName,
          tags: venue.tags,
          hasTastingMenu: venue.hasTastingMenu,
          areaTitles: (venue.areas ?? []).map(a => a.title),
        }),
    cuisineTypes,
    atmosphereTypes: [],
    description: venue.address ?? '',
    descriptionEng: '',
    phone: venue.contact ?? '',
    rating: 4.7,
    reviewCount: 0,
    isActive: venue.isActive,
    rezervemSlug: venue.slug,
  };
}
