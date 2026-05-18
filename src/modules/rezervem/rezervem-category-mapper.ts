/**
 * Rezervem mekanlarını bizim Category koleksiyonundaki kategorilere eşler.
 *
 * Strateji — 3 katman (öncelik sırasıyla):
 *
 *   1) SLUG_OVERRIDES   → manuel override (kullanıcı kararı; en güçlü, skor 1000)
 *   2) HEURISTIC_RULES  → tags/name/cuisine içindeki anahtar kelimelerden skor topla
 *   3) FALLBACK_CATEGORY → eşleşme yoksa bu kategoriye düşür (env ile ezilebilir)
 *
 * Önemli: Burada kullanılan kategori adları, MongoDB'deki RestaurantCategory.name
 * değerleriyle BİREBİR aynı olmalıdır (case-sensitive). Aksi halde adapter, mekan
 * için bir Category dokümanı bulamaz ve _id atayamaz.
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
// Rezervem prod slug'larını öğrenince doldur. Boş bırakılması güvenlidir.
const SLUG_OVERRIDES: Record<string, string> = {
  // 'mikla-istanbul': 'Michelin Guide',
  // 'neolokal': 'Michelin Guide',
};

// ── Katman 2: Heuristic kurallar ─────────────────────────────────────
// Her kural eşleştiğinde ilgili kategoriye skor ekler. Her eşleşme +score.
// Birden fazla kategori eşleşirse en yüksek toplam skor kazanır.
interface HeuristicRule {
  keywords: string[]; // case-insensitive
  category: string;
  score: number;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  // Michelin Guide
  { keywords: ['michelin', 'star', 'yıldız'], category: 'Michelin Guide', score: 150 },

  // Chef Restaurants
  { keywords: ['chef', 'şef', 'tasting menu', 'tadım menüsü', 'omakase'], category: 'Chef Restaurants', score: 90 },

  // Fine Dining
  { keywords: ['fine dining', 'gourmet', 'gastronomi'], category: 'Fine Dining', score: 70 },

  // City Classics
  { keywords: ['classic', 'klasik', 'iconic', 'efsane', 'köklü'], category: 'City Classics', score: 60 },

  // Steakhouse
  { keywords: ['steak', 'steakhouse', 'et', 'grill', 'mangal'], category: 'Steakhouse', score: 60 },

  // Seafood
  { keywords: ['seafood', 'fish', 'balık', 'deniz ürünleri', 'meyhane'], category: 'Seafood', score: 60 },

  // Sushi & Japanese
  { keywords: ['sushi', 'japon', 'japanese', 'ramen', 'izakaya'], category: 'Japanese', score: 80 },

  // Italian
  { keywords: ['italian', 'italyan', 'pizza', 'pasta', 'trattoria'], category: 'Italian', score: 60 },

  // French
  { keywords: ['french', 'fransız', 'bistro', 'brasserie'], category: 'French', score: 60 },

  // Asian
  { keywords: ['asian', 'asya', 'pan asian', 'thai', 'chinese', 'çin'], category: 'Asian', score: 50 },

  // Turkish
  { keywords: ['turkish', 'türk', 'anadolu', 'osmanlı', 'kebap', 'meze'], category: 'Turkish', score: 50 },

  // Rooftop & Bar
  { keywords: ['rooftop', 'sky', 'manzara', 'panorama', 'bar', 'lounge', 'cocktail'], category: 'Rooftop & Bar', score: 40 },

  // Brunch / Cafe
  { keywords: ['brunch', 'breakfast', 'kahvaltı', 'café', 'cafe'], category: 'Brunch & Cafe', score: 40 },
];

// ── Katman 3: Fallback ───────────────────────────────────────────────
// Hiçbir kural eşleşmezse buraya düşer. Env REZERVEM_FALLBACK_CATEGORY ile ezilir.
export const DEFAULT_FALLBACK_CATEGORY = 'City Classics';

// ── Mapper ───────────────────────────────────────────────────────────
function tokenize(input: MappingInput): string {
  const parts: string[] = [
    input.name,
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
  // 1) Slug override — kazanır
  const overrideCategory = SLUG_OVERRIDES[input.slug];
  if (overrideCategory) {
    return {
      categoryKey: overrideCategory,
      score: 1000,
      matchedKeywords: ['__slug_override__'],
    };
  }

  // 2) Heuristic — anahtar kelime taraması
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

  // hasTastingMenu özel boost — Chef Restaurants'a +40
  if (input.hasTastingMenu) {
    if (!tally['Chef Restaurants']) tally['Chef Restaurants'] = { score: 0, keywords: [] };
    tally['Chef Restaurants'].score += 40;
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
 * Awards alanına dönüştürülür (mobile `restaurant.awards: string[]`).
 */
export function deriveBadges(input: MappingInput): string[] {
  const badges: string[] = [];
  const text = tokenize(input);

  if (text.includes('michelin')) badges.push('Michelin');
  if (text.includes('tasting menu') || text.includes('tadım menüsü') || input.hasTastingMenu) {
    badges.push('Tasting Menu');
  }
  if (text.includes('rooftop') || text.includes('manzara')) badges.push('Rooftop');
  if (text.includes('chef') || text.includes('şef')) badges.push("Chef's Table");

  return Array.from(new Set(badges));
}
