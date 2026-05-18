/**
 * Rezervem mekanlarını bizim Category koleksiyonundaki kategorilere eşler.
 *
 * Strateji — 3 katman (öncelik sırasıyla):
 *
 *   1) SLUG_OVERRIDES   → manuel override (kullanıcı kararı; en güçlü, skor 1000)
 *   2) HEURISTIC_RULES  → tags/name/slug içindeki anahtar kelimelerden skor topla
 *   3) FALLBACK         → eşleşme yoksa REZERVEM_FALLBACK_CATEGORY (env)
 *
 * ÖNEMLİ: Burada üretilen kategori adları, MongoDB'deki RestaurantCategory.name
 * değerleriyle BİREBİR aynı olmalıdır (case-sensitive, Türkçe karakter dahil).
 * Aksi halde adapter, mekan için bir Category dokümanı bulamaz ve mobil tarafta
 * o kategori altında hiç restoran görünmez.
 *
 * DB'de şu an `visibleOnHomePage: true` olan 4 kategori:
 *   - Türk Mutfağı
 *   - Michelin Guide
 *   - Chef Restaurants
 *   - City Classics  (← fallback)
 *
 * Mapper SADECE bu 4 isme yazar; diğer kategori adları üretilmez.
 */

export interface MappingInput {
  slug: string;
  name: string;
  displayName?: string;
  tags?: Array<{ title: string; summary?: string }>;
  hasTastingMenu?: boolean;
  areaTitles?: string[];
}

export interface MappingResult {
  categoryKey: string;
  score: number; // 1000 override, 1–999 heuristic, 0 fallback
  matchedKeywords: string[];
}

// ── Katman 1: Slug override ──────────────────────────────────────────
// Test ortamında tags/displayName boş döndüğü için Michelin gibi kritik
// etiketleri yakalamanın tek güvenli yolu manuel override. Prod'da slug'lar
// öğrenildikçe genişletilir.
const SLUG_OVERRIDES: Record<string, string> = {
  'yeni-lokanta': 'Michelin Guide',
  'mikla-istanbul': 'Michelin Guide',
  'neolokal': 'Michelin Guide',
  'turk-fatih-tutak': 'Michelin Guide',
  'genji-gokturk': 'Chef Restaurants', // Göktürk = İstanbul ilçesi, Türk mutfağı değil
};

// ── Katman 2: Heuristic kurallar ─────────────────────────────────────
// Sadece DB'de mevcut olan kategorilere yazılır. Birden fazla kategori
// eşleşirse en yüksek toplam skor kazanır.
interface HeuristicRule {
  keywords: string[]; // case-insensitive substring
  category: string;
  score: number;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  // Michelin Guide — yıldız/michelin/star
  { keywords: ['michelin', 'yıldız', 'star'], category: 'Michelin Guide', score: 200 },

  // Chef Restaurants — şef/chef/tadım menüsü/omakase
  {
    keywords: ['chef', 'şef', 'tasting menu', 'tadım', 'tadim menüsü', 'omakase'],
    category: 'Chef Restaurants',
    score: 120,
  },

  // Türk Mutfağı — kebap, meze, ocakbaşı, meyhane, et, balık-meyhane vs.
  {
    keywords: [
      'türk',
      'turk',
      'turkish',
      'kebap',
      'kebab',
      'meze',
      'meyhane',
      'ocakbaşı',
      'ocakbasi',
      'anadolu',
      'osmanlı',
      'osmanli',
      'et kebap',
      'et-kebap',
      'mur-et',
      'köfte',
      'kofte',
      'lokanta',
    ],
    category: 'Türk Mutfağı',
    score: 90,
  },
];

// ── Katman 3: Fallback ───────────────────────────────────────────────
export const DEFAULT_FALLBACK_CATEGORY = 'City Classics';

// ── Mapper ───────────────────────────────────────────────────────────
function tokenize(input: MappingInput): string {
  // slug'ı da tokenize'a dahil et — test ortamında diğer alanlar boş gelebilir
  // ve slug genelde anlamlı kelimeler içerir (karkas-et-kebap, nadide-meyhane).
  const parts: string[] = [
    input.slug.replace(/[-_]+/g, ' '),
    input.name ?? '',
    input.displayName ?? '',
    ...(input.tags ?? []).map((t) => `${t.title} ${t.summary ?? ''}`),
    ...(input.areaTitles ?? []),
  ];
  return parts.join(' ').toLowerCase();
}

export function mapVenueToCategory(
  input: MappingInput,
  fallback: string = DEFAULT_FALLBACK_CATEGORY,
): MappingResult {
  // 1) Slug override
  const overrideCategory = SLUG_OVERRIDES[input.slug];
  if (overrideCategory) {
    return {
      categoryKey: overrideCategory,
      score: 1000,
      matchedKeywords: ['__slug_override__'],
    };
  }

  // 2) Heuristic
  const haystack = tokenize(input);
  const tally: Record<string, { score: number; keywords: string[] }> = {};

  for (const rule of HEURISTIC_RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        if (!tally[rule.category]) tally[rule.category] = { score: 0, keywords: [] };
        tally[rule.category].score += rule.score;
        tally[rule.category].keywords.push(kw);
      }
    }
  }

  // hasTastingMenu → Chef Restaurants'a güçlü boost
  if (input.hasTastingMenu) {
    if (!tally['Chef Restaurants']) tally['Chef Restaurants'] = { score: 0, keywords: [] };
    tally['Chef Restaurants'].score += 80;
    tally['Chef Restaurants'].keywords.push('__hasTastingMenu__');
  }

  const winner = Object.entries(tally).sort((a, b) => b[1].score - a[1].score)[0];
  if (winner && winner[1].score > 0) {
    return {
      categoryKey: winner[0],
      score: winner[1].score,
      matchedKeywords: winner[1].keywords,
    };
  }

  // 3) Fallback
  return { categoryKey: fallback, score: 0, matchedKeywords: [] };
}

/**
 * Mekan badge'leri — kart üzerinde gösterilecek küçük etiketler.
 * Mobil tarafında `restaurant.awards: string[]` olarak okunur.
 */
export function deriveBadges(input: MappingInput): string[] {
  const badges: string[] = [];
  const text = tokenize(input);

  if (text.includes('michelin')) badges.push('Michelin');
  if (text.includes('tasting menu') || text.includes('tadım') || input.hasTastingMenu) {
    badges.push('Tasting Menu');
  }
  if (text.includes('omakase')) badges.push('Omakase');
  if (text.includes('chef') || text.includes('şef')) badges.push("Chef's Table");

  return Array.from(new Set(badges));
}
