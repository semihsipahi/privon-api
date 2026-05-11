import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

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
  role: { type: String, required: true, enum: ['super_admin', 'restaurant_owner', 'user', 'premium_user', 'trial_user'] },
  status: { type: String, required: true, enum: ['active', 'banned', 'passive'], default: 'active' },
  acceptedMarketing: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const WaitlistSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  birthDate: String,
  agreedToTerms: { type: Boolean, required: true },
  agreedToPrivacy: { type: Boolean, required: true },
  consentToCommunications: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function seedTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const User = mongoose.model('User', UserSchema);
    const Waitlist = mongoose.model('Waitlist', WaitlistSchema);

    // Eski test verilerini sil
    await User.deleteMany({
      phoneNumber: { $in: ['5555555555', '5333333333'] },
    });
    await Waitlist.deleteMany({
      phoneNumber: '5444444444',
    });
    console.log('✅ Eski test verileri silindi');

    // 1. Mevcut Kullanıcı (Şifre ile Giriş)
    const existingUserPassword = await bcrypt.hash('testpass123', 10);
    await User.create({
      phoneNumber: '5555555555',
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      fullName: 'Ahmet Yılmaz',
      email: 'ahmet@privon.com',
      birthDate: '1990-05-15',
      password: existingUserPassword,
      isPhoneVerified: true,
      role: 'user',
      status: 'active',
      acceptedMarketing: true,
    });
    console.log('✅ Mevcut kullanıcı oluşturuldu:');
    console.log('   📱 Telefon: +905555555555');
    console.log('   🔑 Şifre: testpass123');
    console.log('   👤 Ad: Ahmet Yılmaz\n');

    // 2. Waitlist Kullanıcısı
    await Waitlist.create({
      phoneNumber: '5444444444',
      firstName: 'Fatih',
      lastName: 'Kaya',
      email: 'fatih@example.com',
      birthDate: '1992-03-20',
      agreedToTerms: true,
      agreedToPrivacy: true,
      consentToCommunications: true,
    });
    console.log('✅ Waitlist kullanıcısı oluşturuldu:');
    console.log('   📱 Telefon: +905444444444');
    console.log('   👤 Ad: Fatih Kaya');
    console.log('   📧 Email: fatih@example.com\n');

    // 3. Yasaklı Kullanıcı
    const bannedUserPassword = await bcrypt.hash('banned123', 10);
    await User.create({
      phoneNumber: '5333333333',
      firstName: 'Zeynep',
      lastName: 'Demir',
      fullName: 'Zeynep Demir',
      email: 'zeynep@privon.com',
      birthDate: '1988-08-10',
      password: bannedUserPassword,
      isPhoneVerified: true,
      role: 'user',
      status: 'banned',
      acceptedMarketing: false,
    });
    console.log('✅ Yasaklı kullanıcı oluşturuldu:');
    console.log('   📱 Telefon: +905333333333');
    console.log('   ⛔ Durum: Banned\n');

    console.log('========================================');
    console.log('🎯 TEST VERİLERİ BAŞARIYLA EKLENDİ');
    console.log('========================================\n');

    console.log('📋 TEST SENARYOLARI:\n');
    console.log('1️⃣  Mevcut Kullanıcı - Şifre ile Giriş:');
    console.log('   Telefon: 5555555555');
    console.log('   Şifre: testpass123');
    console.log('   Beklenen: password_entry → login → welcome → app\n');

    console.log('2️⃣  Waitlist Kullanıcı:');
    console.log('   Telefon: 5444444444');
    console.log('   Beklenen: waitlist_pending → invite_code → register → app\n');

    console.log('3️⃣  Yasaklı Kullanıcı:');
    console.log('   Telefon: 5333333333');
    console.log('   Beklenen: error (banned) → phone screen\n');

    console.log('4️⃣  Yeni Kullanıcı:');
    console.log('   Herhangi bir başka telefon numarası (örn: 5111111111)');
    console.log('   Beklenen: details → confirming → invite_only → ...\n');

    console.log('========================================');
    console.log('🚀 BAŞLAT:');
    console.log('========================================\n');
    console.log('Terminal 1 - Backend:');
    console.log('  cd privon-api && npm run start:dev\n');
    console.log('Terminal 2 - Mobile:');
    console.log('  cd privon && npm start\n');

    await mongoose.disconnect();
    console.log('\n✨ Seed işlemi tamamlandı!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

seedTestData();
