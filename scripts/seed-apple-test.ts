/**
 * Apple App Store review test hesapları seed scripti.
 *
 * Bu script ONE-TIME çalıştırılır. Mevcut kayıtları kontrol eder, sadece eksikleri ekler.
 *
 * Oluşturur:
 *  1. Whitelist: 5000000001 ve 5000000002
 *  2. Referral code: APPLETEST (quota: 999, corporate)
 *  3. Test kullanıcısı: 5000000001 — mevcut kullanıcı, şifre ile direkt giriş yapılabilir
 *
 * Kullanım:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-apple-test.ts
 *
 * Ortam değişkeni olarak MONGO_URI okunur (.env'den veya export ile).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import mongoose, { Schema, Document } from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI tanımlı değil. .env dosyasını kontrol edin.');
  process.exit(1);
}

// ─── Test hesabı sabitleri ────────────────────────────────────────────────────

const TEST_PHONE_1 = '5000000001'; // Mevcut kullanıcı — şifre ile giriş
const TEST_PHONE_2 = '5000000002'; // Yeni kullanıcı — kayıt akışı testi
const TEST_PASSWORD = 'AppleTest2024!';
const TEST_INVITE_CODE = 'APPLETEST';

// ─── Minimal şemalar (sadece seed için) ──────────────────────────────────────

const WhitelistSchema = new Schema(
  { phoneNumber: { type: String, required: true, unique: true }, note: String, addedBy: String },
  { timestamps: true, collection: 'whitelist' },
);

const ReferralCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    assignedTo: String,
    description: String,
    quota: { type: Number, required: true, default: 1 },
    usedCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    fullName: String,
    maskedName: String,
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: String,
    isPhoneVerified: { type: Boolean, default: false },
    verificationCode: String,
    codeExpiresAt: Date,
    role: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    isActive: { type: Boolean, default: true },
    subscriptionExpiresAt: Date,
    acceptedMarketing: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    noShowDates: [Date],
    transactions: [{ type: Object }],
    notification: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      app: { type: Boolean, default: true },
    },
    favoriteRestaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    registeredWithCode: { type: Schema.Types.ObjectId, ref: 'ReferralCode' },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedReservationCount: { type: Number, default: 0 },
    isAnonymized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.pre('save', function (next) {
  if (this.firstName || this.lastName) {
    this.fullName = `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }
  next();
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI!);
  console.log('MongoDB bağlantısı kuruldu.\n');

  const WhitelistModel = mongoose.model('Whitelist', WhitelistSchema);
  const ReferralCodeModel = mongoose.model('ReferralCode', ReferralCodeSchema);
  const UserModel = mongoose.model('User', UserSchema);

  // 1. Whitelist kayıtları
  for (const phone of [TEST_PHONE_1, TEST_PHONE_2]) {
    const exists = await WhitelistModel.findOne({ phoneNumber: phone });
    if (!exists) {
      await WhitelistModel.create({
        phoneNumber: phone,
        note: 'Apple App Store review test hesabı',
        addedBy: 'seed-script',
      });
      console.log(`✔ Whitelist eklendi: ${phone}`);
    } else {
      console.log(`— Whitelist zaten var: ${phone}`);
    }
  }

  // 2. Test kullanıcısı (TEST_PHONE_1) — mevcut kullanıcı, direkt şifre girişi
  let testUser = await UserModel.findOne({ phoneNumber: TEST_PHONE_1 });
  if (!testUser) {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    testUser = new UserModel({
      phoneNumber: TEST_PHONE_1,
      firstName: 'Apple',
      lastName: 'Reviewer',
      email: 'apple.reviewer@privon-test.com',
      password: hashedPassword,
      isPhoneVerified: true,
      role: 'trial_user',
      status: 'active',
      subscriptionExpiresAt: new Date('2099-12-31'),
      acceptedMarketing: false,
      transactions: [
        {
          type: 'registration',
          description: 'Apple App Store review hesabı — seed',
          createdAt: new Date(),
        },
      ],
    });
    await testUser.save();
    console.log(`✔ Test kullanıcısı oluşturuldu: ${TEST_PHONE_1}`);
  } else {
    console.log(`— Test kullanıcısı zaten var: ${TEST_PHONE_1}`);
  }

  // 3. Apple test invite code (APPLETEST)
  const existingCode = await ReferralCodeModel.findOne({ code: TEST_INVITE_CODE });
  if (!existingCode) {
    // SuperAdmin kullanıcıyı bul — createdBy için gerçek bir ObjectId gerekiyor
    const superAdmin = await UserModel.findOne({ role: 'super_admin' });
    const createdById = superAdmin ? superAdmin._id : testUser._id;

    await ReferralCodeModel.create({
      code: TEST_INVITE_CODE,
      type: 'corporate',
      status: 'active',
      assignedTo: 'Apple App Store Review',
      description: 'Apple review ekibi için sınırsız kullanım kodu',
      quota: 999,
      usedCount: 0,
      createdBy: createdById,
    });
    console.log(`✔ Invite code oluşturuldu: ${TEST_INVITE_CODE}`);
  } else {
    console.log(`— Invite code zaten var: ${TEST_INVITE_CODE}`);
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('Apple App Store Connect — Demo Account Credentials:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Mevcut kullanıcı girişi:');
  console.log(`  Telefon : +90 ${TEST_PHONE_1}`);
  console.log(`  Şifre   : ${TEST_PASSWORD}`);
  console.log('');
  console.log('OTP gereken her akış için (telefon doğrulama, şifremi unuttum):');
  console.log(`  OTP     : ${process.env.APPLE_TEST_OTP ?? '000000'}`);
  console.log('');
  console.log('Yeni kullanıcı kayıt akışı testi:');
  console.log(`  Telefon : +90 ${TEST_PHONE_2}`);
  console.log(`  Davet Kodu: ${TEST_INVITE_CODE}`);
  console.log(`  OTP     : ${process.env.APPLE_TEST_OTP ?? '000000'}`);
  console.log('─────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Bağlantı kapatıldı. Seed tamamlandı.');
}

seed().catch((err) => {
  console.error('Seed hatası:', err);
  process.exit(1);
});
