import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

const MICHELIN_AWARD = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Michelin_star.svg/64px-Michelin_star.svg.png';

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function allDayHours(open: string, close: string) {
  return TR_DAYS.map((dayName) => ({
    dayName,
    isClosed: false,
    periods: [{ openingTime: open, closingTime: close }],
  }));
}

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  fullName: String,
  email: { type: String, unique: true, sparse: true },
  birthDate: String,
  password: String,
  isPhoneVerified: { type: Boolean, default: false },
  verificationCode: String,
  codeExpiresAt: Date,
  role: { type: String, required: true },
  status: { type: String, required: true, default: 'active' },
  acceptedMarketing: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: String,
  color: String,
  visibleOnHomePage: Boolean,
  order: Number,
}, { timestamps: true });

const RestaurantSchema = new mongoose.Schema({
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
  workingHours: [{
    dayName: String,
    periods: [{ openingTime: String, closingTime: String }],
    isClosed: { type: Boolean, default: false },
  }],
  awards: [String],
}, { timestamps: true });

RestaurantSchema.index({ 'location.coordinates': '2dsphere' });

async function seedDemoData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı:', MONGO_URI.replace(/\/\/.*@/, '//***@'));

    const User = mongoose.model('User', UserSchema);
    const Category = mongoose.model('RestaurantCategory', CategorySchema);
    const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

    // 1. Demo owner user
    const ownerPassword = await bcrypt.hash('Demo1234!', 10);
    const owner = await User.findOneAndUpdate(
      { phoneNumber: '5900000000' },
      {
        phoneNumber: '5900000000',
        firstName: 'Demo',
        lastName: 'Owner',
        fullName: 'Demo Owner',
        email: 'demo@privon.com',
        birthDate: '1985-01-01',
        password: ownerPassword,
        isPhoneVerified: true,
        role: 'super_admin',
        status: 'active',
        acceptedMarketing: false,
        imageUrl: '',
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('✅ Demo owner hazır (5900000000 / Demo1234!)');

    // 2. Categories
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
    console.log('✅ 3 kategori hazır (Michelin Guide, Chef Restaurants, City Classics)');

    // 3. Restaurants
    const restaurants = [
      {
        name: 'Gourmet Sushi',
        images: [
          'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
          'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [28.9982, 41.0502], address: 'Abdi İpekçi Cad.', city: 'İstanbul', district: 'Nişantaşı' },
        phone: '+902121110001',
        email: 'info@gourmetsushi.com',
        awards: [MICHELIN_AWARD, MICHELIN_AWARD],
        workingHours: allDayHours('12:00', '23:30'),
      },
      {
        name: 'Carbone',
        images: [
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0422, 41.0785], address: 'Cevdetpaşa Cad.', city: 'İstanbul', district: 'Bebek' },
        phone: '+902121110002',
        email: 'info@carbone.com.tr',
        awards: [MICHELIN_AWARD],
        workingHours: allDayHours('13:00', '00:00'),
      },
      {
        name: 'La Maison',
        images: [
          'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
          'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0282, 41.0847], address: 'Nispetiye Cad.', city: 'İstanbul', district: 'Etiler' },
        phone: '+902121110003',
        email: 'reservation@lamaison.com.tr',
        awards: [MICHELIN_AWARD, MICHELIN_AWARD],
        workingHours: allDayHours('18:00', '23:00'),
      },
      {
        name: 'Ocean Prime',
        images: [
          'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
          'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80',
        ],
        categories: [michelin._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [29.0458, 41.0636], address: 'Kuruçeşme Cad.', city: 'İstanbul', district: 'Kuruçeşme' },
        phone: '+902121110004',
        email: 'info@oceanprime.com.tr',
        awards: [],
        workingHours: allDayHours('16:00', '01:00'),
      },
      {
        name: 'The Cellar',
        images: [
          'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [28.9743, 41.0257], address: 'Bankalar Cad.', city: 'İstanbul', district: 'Galata' },
        phone: '+902121110005',
        email: 'info@thecellar.com.tr',
        awards: [],
        workingHours: allDayHours('17:00', '00:00'),
      },
      {
        name: 'Zen Fusion',
        images: [
          'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
          'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9748, 41.0236], address: 'Kemankeş Cad.', city: 'İstanbul', district: 'Karaköy' },
        phone: '+902121110006',
        email: 'hello@zenfusion.com.tr',
        awards: [MICHELIN_AWARD],
        workingHours: allDayHours('12:00', '23:00'),
      },
      {
        name: 'Sweet Art',
        images: [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
        ],
        categories: [chef._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0248, 40.9878], address: 'Moda Cad.', city: 'İstanbul', district: 'Moda' },
        phone: '+902121110007',
        email: 'info@sweetart.com.tr',
        awards: [MICHELIN_AWARD],
        workingHours: allDayHours('09:00', '22:00'),
      },
      {
        name: 'Ege Rüzgarı',
        images: [
          'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&q=80',
          'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9818, 41.0307], address: 'Sıraselviler Cad.', city: 'İstanbul', district: 'Cihangir' },
        phone: '+902121110008',
        email: 'info@egeruzgari.com.tr',
        awards: [],
        workingHours: allDayHours('11:00', '01:00'),
      },
      {
        name: 'Royal Table',
        images: [
          'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
          'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 3,
        location: { type: 'Point', coordinates: [29.0587, 41.1258], address: 'Kireçburnu Cad.', city: 'İstanbul', district: 'Tarabya' },
        phone: '+902121110009',
        email: 'info@royaltable.com.tr',
        awards: [],
        workingHours: allDayHours('19:00', '23:30'),
      },
      {
        name: 'Sami & Susu',
        images: [
          'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800&q=80',
          'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
        ],
        categories: [classics._id],
        priceLevel: 2,
        location: { type: 'Point', coordinates: [28.9694, 41.0128], address: 'Atatürk Cad.', city: 'İstanbul', district: 'Fatih' },
        phone: '+902121110010',
        email: 'info@samisusu.com.tr',
        awards: [],
        workingHours: allDayHours('11:00', '23:00'),
      },
    ];

    let created = 0;
    let updated = 0;
    for (const data of restaurants) {
      const existing = await Restaurant.findOne({ name: data.name });
      if (existing) {
        await Restaurant.findOneAndUpdate({ name: data.name }, { ...data, owner: owner._id, isActive: true });
        updated++;
      } else {
        await Restaurant.create({ ...data, owner: owner._id, isActive: true });
        created++;
      }
    }

    console.log(`✅ Restoranlar: ${created} oluşturuldu, ${updated} güncellendi`);

    console.log('\n========================================');
    console.log('🎯 DEMO VERİLERİ BAŞARIYLA EKLENDİ');
    console.log('========================================');
    console.log('\n📋 KATEGORİLER (visibleOnHomePage=true):');
    console.log('  1. Michelin Guide  (order:1, #E4002B)');
    console.log('  2. Chef Restaurants (order:2, #1a1a1a)');
    console.log('  3. City Classics    (order:3, #4A4A4A)');
    console.log('\n🍽️  RESTORANLAR (10 adet):');
    restaurants.forEach((r, i) => {
      const catName = r.categories[0].toString() === michelin._id.toString()
        ? 'Michelin Guide'
        : r.categories[0].toString() === chef._id.toString()
          ? 'Chef Restaurants'
          : 'City Classics';
      console.log(`  ${i + 1}. ${r.name} — ${catName} — ${'₺'.repeat(r.priceLevel)} — ${r.awards.length} ödül`);
    });
    console.log('\n👤 DEMO OWNER:');
    console.log('  📱 Telefon: +905900000000');
    console.log('  🔑 Şifre: Demo1234!');
    console.log('  📧 Email: demo@privon.com');
    console.log('\n========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', (error as Error).message);
    process.exit(1);
  }
}

seedDemoData();
