import { RezervemVenue } from '../../models/rezervem-venue.schema';

/**
 * Rezervem cache dokümanını, mobil uygulamanın beklediği ApiRestaurant
 * shape'ine çevirir. Mobil tarafta types/restaurant.ts içinde ApiRestaurant
 * interface'i tanımlı — burada o sözleşmeyi koruyoruz.
 *
 * - _id  → slug (mobil tarafta detay sayfası id ile gelir; slug benzersizdir)
 * - image / images → coverPhoto + photos (bootstrap'tan derlenmiş)
 * - categories → [{ _id: <real Mongo Category id>, name: categoryKey }]
 * - rezervemSlug → slug
 */
export function mapRezervemToApiRestaurant(
  venue: RezervemVenue & { _id?: any },
  category: { _id: string; name: string } | null,
  listView: boolean,
): any {
  const images = (venue.photos ?? []).filter(Boolean);
  const cover = venue.coverPhoto || images[0] || venue.logoUrl || '';

  const cuisineTypes: string[] = (venue.tags ?? [])
    .map((t) => t.title)
    .filter((t): t is string => !!t);

  const base: any = {
    _id: venue.slug,
    name: venue.name,
    image: cover,
    images: listView ? (cover ? [cover] : []) : images,
    categories: category ? [{ _id: category._id, name: category.name }] : [],
    priceLevel: 3, // Rezervem priceLevel sağlamıyor — şimdilik sabit ₺₺₺
    location: {
      coordinates: [0, 0] as [number, number],
      address: venue.address ?? '',
    },
    workingHours: [], // Rezervem'in `workingHours` string'i serbest format; UI bunu kullanmıyor
    awards: venue.badges ?? [],
    cuisineTypes,
    atmosphereTypes: [],
    description: venue.address ?? '',
    descriptionEng: '',
    phone: venue.contact ?? '',
    rating: 4.7, // Faz 1: statik. Faz ileri: reviews endpoint'i ile beslenir.
    reviewCount: 0,
    isActive: venue.isActive,
    rezervemSlug: venue.slug,
  };

  return base;
}
