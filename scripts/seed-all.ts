/**
 * Master seed script — test users, invite codes, demo restaurants, categories.
 * Idempotent: safe to run multiple times.
 * Usage:
 *   Local:  npm run seed:all
 *   Prod:   MONGO_URI="mongodb+srv://..." npm run seed:all
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

const MICHELIN_STAR_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Michelin_star.svg/64px-Michelin_star.svg.png';

const TR_DAYS = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

function allWeekHours(open: string, close: string) {
  return TR_DAYS.map((dayName) => ({
    dayName,
    isClosed: false,
    periods: [{ openingTime: open, closingTime: close }],
  }));
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    firstName: String,
    lastName: String,
    fullName: String,
    maskedName: String,
    birthDate: String,
    email: { type: String, unique: true, sparse: true },
    password: String,
    isPhoneVerified: { type: Boolean, default: false },
    verificationCode: String,
    codeExpiresAt: Date,
    role: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    acceptedMarketing: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    notification: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      app: { type: Boolean, default: true },
    },
    favoriteRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    completedReservationCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const WaitlistSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    birthDate: String,
    agreedToTerms: { type: Boolean, required: true },
    agreedToPrivacy: { type: Boolean, required: true },
    consentToCommunications: { type: Boolean, default: false },
    hospitalityStandards: String,
    privateClubMemberships: String,
    hospitalityValues: String,
  },
  { timestamps: true },
);

const ReferralCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    assignedTo: String,
    description: String,
    quota: { type: Number, required: true, default: 1 },
    usedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: String,
    color: String,
    visibleOnHomePage: Boolean,
    order: Number,
  },
  { timestamps: true },
);

const RestaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    images: [String],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantCategory' }],
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    priceLevel: Number,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
      address: String,
      city: String,
      district: String,
    },
    website: String,
    phone: { type: String, unique: true, sparse: true },
    email: String,
    menu: String,
    workingHours: [
      {
        dayName: String,
        periods: [{ openingTime: String, closingTime: String }],
        isClosed: { type: Boolean, default: false },
      },
    ],
    awards: [String],
  },
  { timestamps: true },
);

RestaurantSchema.index({ 'location.coordinates': '2dsphere' });

// ─── Main ────────────────────────────────────────────────────────────────────

async function seedAll() {
  const isMasked = MONGO_URI.includes('@');
  const displayUri = isMasked
    ? MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    : MONGO_URI;

  console.log('\n🚀 PRIVON SEED BAŞLIYOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Hedef: ${displayUri}\n`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const User = mongoose.model('User', UserSchema);
    const Waitlist = mongoose.model('Waitlist', WaitlistSchema);
    const ReferralCode = mongoose.model('ReferralCode', ReferralCodeSchema);
    const Category = mongoose.model('RestaurantCategory', CategorySchema);
    const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

    // ── 1. SUPER ADMIN ──────────────────────────────────────────────────────
    console.log('👑 [1/5] Super Admin oluşturuluyor...');
    const adminPassword = await bcrypt.hash('Admin1234!', 10);
    const admin = await User.findOneAndUpdate(
      { phoneNumber: '5000000000' },
      {
        phoneNumber: '5000000000',
        firstName: 'Privon',
        lastName: 'Admin',
        fullName: 'Privon Admin',
        email: 'admin@privon.com',
        birthDate: '1985-01-01',
        password: adminPassword,
        isPhoneVerified: true,
        role: 'super_admin',
        status: 'active',
        acceptedMarketing: false,
        imageUrl: '',
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('   ✓ admin@privon.com  |  5000000000  |  Admin1234!\n');

    // ── 2. TEST KULLANICILARI ────────────────────────────────────────────────
    console.log('👤 [2/5] Test kullanıcıları oluşturuluyor...');

    // 2a. Mevcut kullanıcı — şifreli giriş
    const userPassword = await bcrypt.hash('Test1234!', 10);
    await User.findOneAndUpdate(
      { phoneNumber: '5555555555' },
      {
        phoneNumber: '5555555555',
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        fullName: 'Ahmet Yılmaz',
        email: 'ahmet@privon.com',
        birthDate: '1990-05-15',
        password: userPassword,
        isPhoneVerified: true,
        role: 'user',
        status: 'active',
        acceptedMarketing: true,
        imageUrl: '',
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('   ✓ MEVCUT   | 5555555555 | Test1234!  → password_entry → app');

    // 2b. Yasaklı kullanıcı
    const bannedPassword = await bcrypt.hash('Banned123!', 10);
    await User.findOneAndUpdate(
      { phoneNumber: '5333333333' },
      {
        phoneNumber: '5333333333',
        firstName: 'Zeynep',
        lastName: 'Demir',
        fullName: 'Zeynep Demir',
        email: 'zeynep@privon.com',
        birthDate: '1988-08-10',
        password: bannedPassword,
        isPhoneVerified: true,
        role: 'user',
        status: 'banned',
        acceptedMarketing: false,
        imageUrl: '',
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('   ✓ BANNED   | 5333333333 | Banned123! → hata ekranı');

    // 2c. Waitlist kullanıcısı
    await Waitlist.findOneAndUpdate(
      { phoneNumber: '5444444444' },
      {
        phoneNumber: '5444444444',
        firstName: 'Fatih',
        lastName: 'Kaya',
        email: 'fatih@privon.com',
        birthDate: '1992-03-20',
        agreedToTerms: true,
        agreedToPrivacy: true,
        consentToCommunications: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('   ✓ WAITLIST | 5444444444 | — → waitlist_pending → invite_code');
    console.log('   ✓ YENİ     | 5111111111 | — → yeni kayıt akışı (herhangi başka numara)\n');

    // ── 3. INVITE CODES ──────────────────────────────────────────────────────
    console.log('🎟️  [3/5] Davet kodları oluşturuluyor...');
    const demoCodes = [
      { code: 'PRIVON2024', description: 'Demo davet kodu — genel test' },
      { code: 'WELCOME01', description: 'Waitlist kullanıcısı için demo kod' },
      { code: 'TESTINVITE', description: 'Yeni kullanıcı kayıt testi' },
    ];
    for (const c of demoCodes) {
      await ReferralCode.findOneAndUpdate(
        { code: c.code },
        {
          code: c.code,
          type: 'corporate',
          status: 'active',
          description: c.description,
          quota: 100,
          usedCount: 0,
          createdBy: admin._id,
        },
        { upsert: true, new: true },
      );
      console.log(`   ✓ ${c.code}`);
    }
    console.log();

    // ── 4. KATEGORİLER ──────────────────────────────────────────────────────
    console.log('📂 [4/5] Kategoriler oluşturuluyor...');
    const [michelin, chef, classics] = await Promise.all([
      Category.findOneAndUpdate(
        { name: 'Michelin Guide' },
        { name: 'Michelin Guide', color: '#E4002B', visibleOnHomePage: true, order: 1 },
        { upsert: true, new: true },
      ),
      Category.findOneAndUpdate(
        { name: 'Chef Restaurants' },
        { name: 'Chef Restaurants', color: '#1a1a1a', visibleOnHomePage: true, order: 2 },
        { upsert: true, new: true },
      ),
      Category.findOneAndUpdate(
        { name: 'City Classics' },
        { name: 'City Classics', color: '#4A4A4A', visibleOnHomePage: true, order: 3 },
        { upsert: true, new: true },
      ),
    ]);
    console.log('   ✓ Michelin Guide  (order:1, #E4002B, visibleOnHomePage:true)');
    console.log('   ✓ Chef Restaurants (order:2, #1a1a1a, visibleOnHomePage:true)');
    console.log('   ✓ City Classics    (order:3, #4A4A4A, visibleOnHomePage:true)\n');

    // ── 5. RESTORANLAR ───────────────────────────────────────────────────────
    console.log('🍽️  [5/5] Restoranlar oluşturuluyor...');
    const restaurantData = [
      {
        name: 'Gourmet Sushi',
        images: [
          'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1617196034100-e1e6e4e3a86e?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [28.9982, 41.0502], address: 'Abdi İpekçi Cad. No:12', city: 'İstanbul', district: 'Nişantaşı' },
        phone: '+902121110001',
        email: 'info@gourmetsushi.com.tr',
        awards: [MICHELIN_STAR_URL, MICHELIN_STAR_URL],
        workingHours: allWeekHours('12:00', '23:30'),
      },
      {
        name: 'Carbone',
        images: [
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0422, 41.0785], address: 'Cevdetpaşa Cad. No:43', city: 'İstanbul', district: 'Bebek' },
        phone: '+902121110002',
        email: 'info@carbone.com.tr',
        awards: [MICHELIN_STAR_URL],
        workingHours: allWeekHours('13:00', '00:00'),
      },
      {
        name: 'La Maison',
        images: [
          'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0282, 41.0847], address: 'Nispetiye Cad. No:18', city: 'İstanbul', district: 'Etiler' },
        phone: '+902121110003',
        email: 'reservation@lamaison.com.tr',
        awards: [MICHELIN_STAR_URL, MICHELIN_STAR_URL],
        workingHours: allWeekHours('18:00', '23:00'),
      },
      {
        name: 'Ocean Prime',
        images: [
          'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [29.0458, 41.0636], address: 'Kuruçeşme Cad. No:7', city: 'İstanbul', district: 'Kuruçeşme' },
        phone: '+902121110004',
        email: 'info@oceanprime.com.tr',
        awards: [],
        workingHours: allWeekHours('16:00', '01:00'),
      },
      {
        name: 'The Cellar',
        images: [
          'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [28.9743, 41.0257], address: 'Bankalar Cad. No:5', city: 'İstanbul', district: 'Galata' },
        phone: '+902121110005',
        email: 'info@thecellar.com.tr',
        awards: [],
        workingHours: allWeekHours('17:00', '00:00'),
      },
      {
        name: 'Zen Fusion',
        images: [
          'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9748, 41.0236], address: 'Kemankeş Cad. No:21', city: 'İstanbul', district: 'Karaköy' },
        phone: '+902121110006',
        email: 'hello@zenfusion.com.tr',
        awards: [MICHELIN_STAR_URL],
        workingHours: allWeekHours('12:00', '23:00'),
      },
      {
        name: 'Sweet Art',
        images: [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0248, 40.9878], address: 'Moda Cad. No:34', city: 'İstanbul', district: 'Moda' },
        phone: '+902121110007',
        email: 'info@sweetart.com.tr',
        awards: [MICHELIN_STAR_URL],
        workingHours: allWeekHours('09:00', '22:00'),
      },
      {
        name: 'Ege Rüzgarı',
        images: [
          'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1560717845-968823efbee1?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9818, 41.0307], address: 'Sıraselviler Cad. No:62', city: 'İstanbul', district: 'Cihangir' },
        phone: '+902121110008',
        email: 'info@egeruzgari.com.tr',
        awards: [],
        workingHours: allWeekHours('11:00', '01:00'),
      },
      {
        name: 'Royal Table',
        images: [
          'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0587, 41.1258], address: 'Kireçburnu Cad. No:9', city: 'İstanbul', district: 'Tarabya' },
        phone: '+902121110009',
        email: 'info@royaltable.com.tr',
        awards: [],
        workingHours: allWeekHours('19:00', '23:30'),
      },
      {
        name: 'Sami & Susu',
        images: [
          'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9694, 41.0128], address: 'Atatürk Cad. No:11', city: 'İstanbul', district: 'Fatih' },
        phone: '+902121110010',
        email: 'info@samisusu.com.tr',
        awards: [],
        workingHours: allWeekHours('11:00', '23:00'),
      },
    ];

    let created = 0;
    let updated = 0;
    for (const data of restaurantData) {
      const exists = await Restaurant.findOne({ name: data.name });
      if (exists) {
        await Restaurant.findOneAndUpdate(
          { name: data.name },
          { ...data, owner: admin._id, isActive: true },
        );
        updated++;
      } else {
        await Restaurant.create({ ...data, owner: admin._id, isActive: true });
        created++;
      }
      console.log(`   ✓ ${data.name.padEnd(15)} | ${'₺'.repeat(data.priceLevel).padEnd(4)} | ${
        data.categories[0].toString() === michelin._id.toString()
          ? 'Michelin Guide  '
          : data.categories[0].toString() === chef._id.toString()
            ? 'Chef Restaurants'
            : 'City Classics   '
      } | ${data.awards.length} ⭐`);
    }

    // ── ÖZET ─────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEED TAMAMLANDI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 GİRİŞ TEST SENARYOLARI:\n');
    console.log('1️⃣  Mevcut kullanıcı:');
    console.log('   Telefon: 5555555555  |  Şifre: Test1234!');
    console.log('   Beklenen: password_entry → giriş → uygulama\n');

    console.log('2️⃣  Waitlist kullanıcısı (davet kodu bekleniyor):');
    console.log('   Telefon: 5444444444');
    console.log('   Beklenen: waitlist_pending → invite_code ekranı');
    console.log('   Davet kodu: PRIVON2024 veya WELCOME01\n');

    console.log('3️⃣  Yasaklı kullanıcı:');
    console.log('   Telefon: 5333333333');
    console.log('   Beklenen: "hesabınız askıya alındı" hatası\n');

    console.log('4️⃣  Yeni kullanıcı (başka herhangi numara):');
    console.log('   Örn: 5111111111');
    console.log('   Beklenen: details → confirming → invite_only');
    console.log('   Davet kodu: PRIVON2024 veya TESTINVITE\n');

    console.log('5️⃣  Super Admin (admin panel girişi):');
    console.log('   Telefon: 5000000000  |  Şifre: Admin1234!\n');

    console.log('🍽️  RESTORANLAR:', `${created} oluşturuldu, ${updated} güncellendi`);
    console.log('📂 KATEGORİLER: 3 (Michelin Guide · Chef Restaurants · City Classics)');
    console.log('🎟️  DAVET KODLARI: PRIVON2024 · WELCOME01 · TESTINVITE');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed hatası:', (err as Error).message);
    process.exit(1);
  }
}

seedAll();
