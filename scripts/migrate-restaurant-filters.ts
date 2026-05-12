/**
 * Migration: Restoran Filtre Alanları + Kategoriler
 *
 * Çalıştırır:
 *   [0] Ana kategorileri oluşturur (Michelin Guide, Chef Restaurants, City Classics)
 *   [1] Filtre seçeneklerini oluşturur (cuisine + atmosphere)
 *   [2] Restoranları filtre verileri + kategori bağlantısıyla günceller
 *
 * İdempotent — defalarca çalıştırılabilir.
 *
 * Kullanım:
 *   Local:  npm run migrate:filters
 *   Prod:   MONGO_URI="mongodb+srv://..." npm run migrate:filters
 */

import * as mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    color: String,
    image: String,
    visibleOnHomePage: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { strict: false, timestamps: true },
);

const RestaurantSchema = new mongoose.Schema(
  { name: String, cuisineTypes: [String], atmosphereTypes: [String] },
  { strict: false, timestamps: true },
);

const FilterOptionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['cuisine', 'atmosphere'], required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Kategoriler ───────────────────────────────────────────────────────────────
// Mobil uygulamada category.name ile CATEGORY_DESC_KEY eşleşmesi yapılıyor.
// Bu isimler değiştirilmemelidir.
const CATEGORIES_SEED = [
  { name: 'Michelin Guide',    color: '#E4002B', visibleOnHomePage: true, order: 1 },
  { name: 'Chef Restaurants',  color: '#1a1a1a', visibleOnHomePage: true, order: 2 },
  { name: 'City Classics',     color: '#4A4A4A', visibleOnHomePage: true, order: 3 },
];

// ── Filtre seçenekleri ────────────────────────────────────────────────────────
const FILTER_OPTIONS_SEED = [
  { type: 'cuisine', value: 'mediterranean', label: 'Akdeniz',       order: 0 },
  { type: 'cuisine', value: 'farEast',       label: 'Uzak Doğu',     order: 1 },
  { type: 'cuisine', value: 'italian',       label: 'İtalyan',        order: 2 },
  { type: 'cuisine', value: 'seafood',       label: 'Deniz Ürünleri', order: 3 },
  { type: 'cuisine', value: 'french',        label: 'Fransız',        order: 4 },
  { type: 'cuisine', value: 'japanese',      label: 'Japon',          order: 5 },
  { type: 'cuisine', value: 'turkish',       label: 'Türk',           order: 6 },
  { type: 'cuisine', value: 'asian',         label: 'Asya',           order: 7 },
  { type: 'atmosphere', value: 'romantic',   label: 'Romantik',       order: 0 },
  { type: 'atmosphere', value: 'business',   label: 'İş Yemeği',      order: 1 },
  { type: 'atmosphere', value: 'historical', label: 'Tarihi',         order: 2 },
  { type: 'atmosphere', value: 'scenic',     label: 'Manzaralı',      order: 3 },
  { type: 'atmosphere', value: 'liveMusic',  label: 'Canlı Müzik',    order: 4 },
  { type: 'atmosphere', value: 'seaside',    label: 'Deniz Kenarı',   order: 5 },
];

// ── Restoran → filtre + kategori eşleşmesi ────────────────────────────────────
// Cuisine: Figma filtre mantığıyla örtüşen değerler (eşleşmeyenler boş)
// Koleksiyonlar: Figma ExploreScreen sırası — 0-3 Michelin, 4-6 Şef, 7-9 Klasikler
// Atmosfer: restoranın karakterine göre atandı (Figma'da per-restaurant tanımlı değil)
// PriceLevel: Figma restaurants.ts price alanından (₺=1, ₺₺=2, ₺₺₺=3, ₺₺₺₺=4)
const RESTAURANT_FILTER_MAP: Record<
  string,
  {
    priceLevel: number;
    cuisineTypes: string[];
    atmosphereTypes: string[];
    collectionTypes: string[];
    categoryName: string;        // RestaurantCategory.name — ObjectId bağlantısı için
    description?: string;
    descriptionEng?: string;
    instagramUrl?: string;
    facebookUrl?: string;
  }
> = {
  // ── Michelin Guide (Figma index 0-3, awards: michelin-star) ─────────────────
  'Gourmet Sushi': {
    priceLevel: 4,
    cuisineTypes: ['japanese'],
    atmosphereTypes: ['scenic', 'romantic'],
    collectionTypes: ['michelinGuide'],
    categoryName: 'Michelin Guide',
    description: 'İstanbul\'un en seçkin Japon mutfağı deneyimini sunan Gourmet Sushi, her tabakta ustalık ve minimalist estetik bir arada.',
    descriptionEng: 'A premium dining experience at Gourmet Sushi offering the finest Japanese cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/gourmet.sushi',
    facebookUrl: 'https://facebook.com/gourmet.sushi',
  },
  'Carbone': {
    priceLevel: 3,
    cuisineTypes: ['italian'],
    atmosphereTypes: ['romantic'],
    collectionTypes: ['michelinGuide'],
    categoryName: 'Michelin Guide',
    description: 'New York ruhunu İstanbul\'a taşıyan Carbone, klasik İtalyan lezzetlerini modern bir yorumla sofranıza getiriyor.',
    descriptionEng: 'A premium dining experience at Carbone offering the finest Italian cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/carboneistanbul',
    facebookUrl: 'https://facebook.com/carboneistanbul',
  },
  'La Maison': {
    priceLevel: 4,
    cuisineTypes: ['french'],
    atmosphereTypes: ['romantic', 'scenic'],
    collectionTypes: ['michelinGuide'],
    categoryName: 'Michelin Guide',
    description: 'Fransız mutfağının zarif dünyasına açılan bir kapı. La Maison, Boğaz manzarası eşliğinde unutulmaz bir gastronomi yolculuğu sunuyor.',
    descriptionEng: 'A premium dining experience at La Maison offering the finest French cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/lamaisonistanbul',
    facebookUrl: 'https://facebook.com/lamaisonistanbul',
  },
  'Ocean Prime': {
    priceLevel: 3,
    cuisineTypes: ['seafood'],
    atmosphereTypes: ['seaside'],
    collectionTypes: ['michelinGuide'],
    categoryName: 'Michelin Guide',
    description: 'Denizin taze nefesiyle buluşan şef imzalı deniz ürünleri. Ocean Prime, her lokmasında denizin derinliklerini hissettiriyor.',
    descriptionEng: 'A premium dining experience at Ocean Prime offering the finest seafood in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/oceanprime.ist',
    facebookUrl: 'https://facebook.com/oceanprime.ist',
  },
  // ── Chef Restaurants (Figma index 4-6, awards: gault-millau) ────────────────
  'The Cellar': {
    priceLevel: 4,
    cuisineTypes: [],
    atmosphereTypes: ['historical', 'business'],
    collectionTypes: ['chefRestaurant'],
    categoryName: 'Chef Restaurants',
    description: 'Tarihi bodrum katının benzersiz atmosferinde, şef yaratıcılığının sınırları zorlayan özel menüsüyle iş yemeklerinin yeni adresi.',
    descriptionEng: 'A premium dining experience at The Cellar offering the finest modern European cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/thecellarist',
    facebookUrl: 'https://facebook.com/thecellarist',
  },
  'Zen Fusion': {
    priceLevel: 3,
    cuisineTypes: ['asian'],
    atmosphereTypes: ['scenic'],
    collectionTypes: ['chefRestaurant'],
    categoryName: 'Chef Restaurants',
    description: 'Asya\'nın zengin mutfak kültürünü Batı teknikleriyle harmanlayan Zen Fusion, her tabakta bir denge sanatı sunuyor.',
    descriptionEng: 'A premium dining experience at Zen Fusion offering the finest Asian fusion cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/zenfusionist',
    facebookUrl: 'https://facebook.com/zenfusionist',
  },
  'Sweet Art': {
    priceLevel: 4,
    cuisineTypes: [],
    atmosphereTypes: ['romantic'],
    collectionTypes: ['chefRestaurant'],
    categoryName: 'Chef Restaurants',
    description: 'Tatlı ile sanatın kesiştiği eşsiz bir deneyim. Sweet Art\'ın şef pastacısı, her diyet kısıtlamasına özel başyapıtlar yaratıyor.',
    descriptionEng: 'A premium dining experience at Sweet Art offering the finest pastry & dessert in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/sweetartist',
    facebookUrl: 'https://facebook.com/sweetartist',
  },
  // ── City Classics (Figma index 7-9, awards: yok) ────────────────────────────
  'Ege Rüzgarı': {
    priceLevel: 2,
    cuisineTypes: ['mediterranean'],
    atmosphereTypes: ['seaside'],
    collectionTypes: ['cityClassic'],
    categoryName: 'City Classics',
    description: 'Ege\'nin serin rüzgarı ve taze zeytinyağlı lezzetleri İstanbul\'a taşıyan samimi bir Akdeniz sofrası.',
    descriptionEng: 'A premium dining experience at Ege Rüzgarı offering the finest Mediterranean cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/egeruzgari',
    facebookUrl: 'https://facebook.com/egeruzgari',
  },
  'Royal Table': {
    priceLevel: 4,
    cuisineTypes: [],
    atmosphereTypes: ['historical', 'scenic'],
    collectionTypes: ['cityClassic'],
    categoryName: 'City Classics',
    description: 'Osmanlı saray geleneğinden ilham alan Royal Table, tarihi mekânı ve ihtişamlı sunumuyla İstanbul\'un simge restoranlarından biri.',
    descriptionEng: 'A premium dining experience at Royal Table offering the finest international cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/royaltableist',
    facebookUrl: 'https://facebook.com/royaltableist',
  },
  'Sami & Susu': {
    priceLevel: 3,
    cuisineTypes: ['mediterranean'],
    atmosphereTypes: ['liveMusic'],
    collectionTypes: ['cityClassic'],
    categoryName: 'City Classics',
    description: 'Canlı müzik eşliğinde Akdeniz mezeleri ve sıcak ev atmosferi. Sami & Susu, İstanbul\'un en sevilen köşelerinden biri olmayı hak ediyor.',
    descriptionEng: 'A premium dining experience at Sami & Susu offering the finest Mediterranean cuisine in an unforgettable atmosphere.',
    instagramUrl: 'https://instagram.com/samisusu',
    facebookUrl: 'https://facebook.com/samisusu',
  },
};

async function migrateRestaurantFilters() {
  const isMasked = MONGO_URI.includes('@');
  const displayUri = isMasked
    ? MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    : MONGO_URI;

  console.log('\n🔄 RESTORAN FİLTRE MİGRASYONU BAŞLIYOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Hedef: ${displayUri}\n`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const Category = mongoose.model('RestaurantCategory', CategorySchema);
    const Restaurant = mongoose.model('Restaurant', RestaurantSchema);
    const FilterOption = mongoose.model('FilterOption', FilterOptionSchema);

    // ── 0. KATEGORİLER ───────────────────────────────────────────────────────
    console.log('🗂  [0] Ana kategoriler oluşturuluyor...');
    const categoryIdMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const cat of CATEGORIES_SEED) {
      const doc = await Category.findOneAndUpdate(
        { name: cat.name },
        { $setOnInsert: cat },
        { upsert: true, new: true },
      );
      categoryIdMap[cat.name] = doc!._id as mongoose.Types.ObjectId;
      console.log(`   ✓ ${cat.name} (order:${cat.order})`);
    }
    console.log();

    // ── 1. FİLTRE SEÇENEKLERİ ───────────────────────────────────────────────
    console.log('🔧 [1] Filtre seçenekleri oluşturuluyor...');
    for (const opt of FILTER_OPTIONS_SEED) {
      await FilterOption.findOneAndUpdate(
        { type: opt.type, value: opt.value },
        { $setOnInsert: opt },
        { upsert: true, new: true },
      );
      console.log(`   ✓ [${opt.type}] ${opt.label} (${opt.value})`);
    }
    console.log();

    // ── 2. RESTORANLAR ───────────────────────────────────────────────────────
    console.log('🍽  [2] Restoranlar güncelleniyor...');
    let updated = 0;
    let skipped = 0;

    for (const [name, filters] of Object.entries(RESTAURANT_FILTER_MAP)) {
      const categoryId = categoryIdMap[filters.categoryName];
      const result = await Restaurant.findOneAndUpdate(
        { name },
        {
          $set: {
            priceLevel: filters.priceLevel,
            cuisineTypes: filters.cuisineTypes,
            atmosphereTypes: filters.atmosphereTypes,
            collectionTypes: filters.collectionTypes,
            ...(filters.description    ? { description:    filters.description    } : {}),
            ...(filters.descriptionEng ? { descriptionEng: filters.descriptionEng } : {}),
            ...(filters.instagramUrl   ? { instagramUrl:   filters.instagramUrl   } : {}),
            ...(filters.facebookUrl    ? { facebookUrl:    filters.facebookUrl    } : {}),
          },
          $addToSet: { categories: categoryId },
        },
        { new: true },
      );

      if (result) {
        console.log(`   ✓ ${name.padEnd(20)} | fiyat: ${filters.priceLevel} | kategori: ${filters.categoryName}`);
        updated++;
      } else {
        console.log(`   ⚠ ${name} — bulunamadı, atlandı`);
        skipped++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MİGRASYON TAMAMLANDI');
    console.log(`   Kategoriler:         ${CATEGORIES_SEED.length} (idempotent)`);
    console.log(`   Filtre seçenekleri:  ${FILTER_OPTIONS_SEED.length} (idempotent)`);
    console.log(`   Güncellenen restoran: ${updated}`);
    console.log(`   Atlanılan restoran:   ${skipped} (DB'de yok)`);
    console.log('\n📋 NOT: Yeni restoranlar admin panelinden eklenmelidir.');
    console.log('📋 NOT: Yeni filtre seçenekleri admin paneli → Filtreler menüsünden eklenir.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migrasyon hatası:', (err as Error).message);
    process.exit(1);
  }
}

migrateRestaurantFilters();
