import * as mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

const LegalDocumentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ['terms_of_use', 'privacy_policy', 'explicit_consent', 'cookie_policy', 'commercial_consent'] },
    version: { type: Number, required: true },
    title: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    content: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    summary: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    isActive: { type: Boolean, default: true },
    effectiveDate: { type: Date, required: true },
  },
  { timestamps: true },
);

LegalDocumentSchema.index({ type: 1, version: 1 }, { unique: true });
LegalDocumentSchema.index({ type: 1, isActive: 1 });

const explicitConsentTr = `AÇIK RIZA METNİ VE BEYANI

Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON) tarafından, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında bilgilendirildiğimi kabul ederim; açık rızamın bulunması halinde arama geçmişim, beğenilerim, rezervasyonlarım ve platform kullanım alışkanlıklarım gibi davranış verilerimin analiz edilmesine ve bu kapsamda tarafıma kişiselleştirilmiş mekân önerileri ve içerik sunulması amacıyla profilleme yapılmasına, ayrıca kişisel verilerimin rezervasyon işlemlerinin yürütülmesi, rezervasyon bilgilerinin ilgili iş ortaklarıyla paylaşılması, ödeme ve harcama kayıtlarının tutulması, platform güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmesine açık rıza veriyorum; açık rızamı dilediğim zaman geri alabileceğimi bildiğimi kabul, beyan ve taahhüt ederim.`;

const explicitConsentEn = `EXPLICIT CONSENT TEXT AND DECLARATION

I acknowledge that I have been informed by Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON) within the scope of the Personal Data Protection Law No. 6698 (KVKK); I hereby give my explicit consent to the processing of my behavioral data such as browsing history, preferences, reservations and platform usage habits for the purpose of profiling to provide me with personalized venue recommendations and content, as well as the processing of my personal data for the execution of reservation processes, sharing of reservation information with relevant business partners, keeping payment and expense records, ensuring platform security and fulfilling legal obligations, provided that my explicit consent is obtained; I acknowledge, declare and undertake that I know I can withdraw my explicit consent at any time.`;

const explicitConsentFr = `TEXTE DE CONSENTEMENT EXPLICITE ET DÉCLARATION

Je reconnais avoir été informé(e) par Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON) dans le cadre de la loi sur la protection des données personnelles n° 6698 (KVKK); je donne par la présente mon consentement explicite au traitement de mes données comportementales telles que l'historique de navigation, les préférences, les réservations et les habitudes d'utilisation de la plateforme à des fins de profilage pour me fournir des recommandations personnalisées de lieux et de contenu, ainsi qu'au traitement de mes données personnelles pour l'exécution des processus de réservation, le partage des informations de réservation avec les partenaires commerciaux concernés, la tenue des registres de paiement et de dépenses, la garantie de la sécurité de la plateforme et le respect des obligations légales; je reconnais, déclare et m'engage à savoir que je peux retirer mon consentement explicite à tout moment.`;

const privacyPolicyTr = `KİŞİSEL VERİLERİN İŞLENMESİ HAKKINDA AYDINLATMA METNİ

Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla, kişisel verilerinizin işlenmesine ilişkin sizleri bilgilendirmek isteriz.

1. Veri Sorumlusunun Kimliği ve İletişim Bilgileri
Veri Sorumlusu: Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON)
Adres: Ataköy 7-8-9-10. Kısım Mah. Çobançeşme E-5 Yan Yol Cad. A No: 22/1 İç Kapı No: 30 Bakırköy/İstanbul
E-posta: info@privon.co

2. Kişisel Verilerinizin Hangi Amaçlarla İşlendiği
Kişisel verileriniz; üyelik süreçlerinin yürütülmesi, rezervasyon hizmetlerinin sunulması, kişiselleştirilmiş öneriler sunulması, harcama takibi ve raporlama, hukuki yükümlülüklerin yerine getirilmesi, müşteri memnuniyetinin sağlanması ve açık rızanız halinde pazarlama faaliyetlerinin yürütülmesi amaçlarıyla işlenmektedir.

3. İşlenen Veri Kategorileri
Kimlik (ad-soyad), iletişim (e-posta, telefon), müşteri işlem (rezervasyon, harcama), pazarlama, işlem güvenliği ve hukuki işlem bilgileriniz işlenmektedir.

4. Verilerin Aktarılması
Kişisel verileriniz; iş ortakları, kanunen yetkili kamu kurumları ve üçüncü taraf hizmet sağlayıcıları ile KVKK'nın 8. ve 9. maddelerine uygun olarak paylaşılabilmektedir.

5. Veri Toplama Yöntemi
Verileriniz; internet sitesi ve mobil uygulama aracılığıyla otomatik ve kısmen otomatik yöntemlerle toplanmaktadır.

6. KVKK Kapsamındaki Haklarınız
KVKK'nın 11. maddesi kapsamında; veri işlenip işlenmediğini öğrenme, işlenme amacını sorgulama, eksik/yanlış verilerin düzeltilmesini isteme, silinmesini talep etme, aktarıldığı kişileri bilme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.`;

const termsOfUseTr = `KULLANIM KOŞULLARI VE ÜYELİK SÖZLEŞMESİ

İşbu Kullanım Koşulları ve Üyelik Sözleşmesi ("Sözleşme"), Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. ("PRIVON", "Şirket", "biz" veya "bizim") tarafından işletilen PRIVON platformu ("Platform") ile bu Platform üzerinden sunulan hizmetlerin kullanımına ilişkin şart ve koşulları düzenlemektedir.

Platform'a üye olarak, bekleme listesine kaydolarak veya Platform'u kullanarak işbu Sözleşme'yi okuduğunuzu, anladığınızı ve tüm hükümlerini kabul ettiğinizi beyan ve taahhüt etmektesiniz.

PRIVON, davetiye üyelik sistemi ile çalışan premium bir restoran rezervasyon platformudur. Platform, üyelerine seçilmiş iş ortağı restoran, otel ve yaşam alanlarında rezervasyon yapma, üye avantajlarından yararlanma, harcama takibi ve kişiselleştirilmiş öneriler sunma hizmetleri sağlar.

Üyelik; davetiye sistemi, referans sistemi, bekleme listesi uygulaması ve/veya PRIVON tarafından belirlenecek sair değerlendirme süreçleri kapsamında oluşturulabilir. PRIVON, herhangi bir üyelik başvurusunu gerekçe göstermeksizin reddetme hakkını saklı tutar.

Üyeler, üyeliklerini diledikleri zaman sona erdirebilir. PRIVON, işbu Sözleşme'ye aykırı davranışlar halinde üyeliği askıya alma veya sona erdirme hakkına sahiptir.

PRIVON, işbu Sözleşme'de dilediği zaman tek taraflı değişiklik yapma hakkını saklı tutar. Değişiklikler Platform üzerinde yayımlandığı tarihten itibaren geçerlilik kazanır.`;

const cookiePolicyTr = `ÇEREZ POLİTİKASI

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10'uncu maddesi ile Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ kapsamında veri sorumlusu sıfatıyla Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. ("PRIVON") tarafından hazırlanmıştır.

1. Kullanılan Çerez Türleri
- Zorunlu Çerezler: Platformun temel işlevlerini yerine getirebilmesi için gerekli olan çerezlerdir. Bu çerezler birinci taraf çerezler olup oturum süresince saklanırlar.
- Performans/Analitik Çerezler: Platformdaki ziyaretçilerin sayılması ve trafiğin ölçülmesine olanak sağlar. Anonim istatistikler üretilir.
- Reklam/Pazarlama Çerezleri: İlgi alanlarınıza göre profilinizin çıkarılması ve size ilgili reklamlar göstermek amacıyla kullanılır. Açık rızanız alınarak işlenir.
- İşlevsel Çerezler: Platformu daha işlevsel kılmak ve kişiselleştirmek (dil, bölge ve diğer tercihlerin hatırlanması) amacıyla kullanılır.

2. Çerez Yönetimi
Web sitemizi ilk ziyaretiniz sırasında açılan panel üzerinden çerez tercihlerinizi özelleştirebilirsiniz. Zorunlu çerezler dışındaki çerezler için tercihlerinizi "etkin" veya "devre dışı" olarak belirleyebilir, dilediğiniz zaman değiştirebilirsiniz.

3. İşlenen Veri Kategorileri
- Zorunlu Çerezler: Tarayıcı bilgileri, IP adresi ve erişim logları
- Performans Çerezleri: Ziyaret edilen sayfalar, en çok görüntülenen içerikler, tıklanan bağlantılar
- Reklam Çerezleri: İlgi alanları, kullanıcı profili ve davranışsal veriler
- İşlevsel Çerezler: Dil, bölge ve tema tercihleri

4. KVKK Kapsamındaki Haklarınız
KVKK'nın 11. maddesi kapsamındaki taleplerinizi info@privon.co adresine iletebilirsiniz.`;

const commercialConsentTr = `TİCARİ ELEKTRONİK İLETİ ONAY BELGESİ

Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. (PRIVON)

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK"), 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ("ETK") ve ilgili sair mevzuat kapsamında, Yemap Teknoloji ve Gıda Sanayi ve Dış Ticaret A.Ş. ("Şirket") tarafından tarafıma sunulan Aydınlatma Metni doğrultusunda bilgilendirildiğimi kabul ederim.

Bu kapsamda, Şirket tarafından sunulan hizmetlere ilişkin olarak; yeni ürün ve hizmetlerin tanıtımı, kampanya ve özel tekliflerin iletilmesi, mevcut ürün ve hizmetlerin kullanımının artırılmasına yönelik pazarlama faaliyetlerinin yürütülmesi, müşteri memnuniyeti ve deneyiminin geliştirilmesine yönelik anket uygulamalarının gerçekleştirilmesi amaçlarıyla, iletişim bilgilerime ticari elektronik ileti gönderilmesine açıkça onay verdiğimi beyan ederim.

İletiler; arama (telefon), kısa mesaj (SMS), elektronik posta (e-posta) ve benzeri elektronik iletişim araçları aracılığıyla gönderilebilir.

Verdiğim bu onayı; her zaman, herhangi bir gerekçe göstermeksizin ve ücretsiz olarak geri alabileceğimi; her iletide yer alan çıkış/ret seçeneğini kullanabileceğimi veya İYS üzerinden iletişim tercihlerimi değiştirebileceğimi kabul ederim.`;

const documents = [
  {
    type: 'explicit_consent',
    version: 1,
    title: {
      tr: 'Açık Rıza Metni',
      en: 'Explicit Consent Text',
      fr: 'Consentement Explicite',
    },
    content: {
      tr: explicitConsentTr,
      en: explicitConsentEn,
      fr: explicitConsentFr,
    },
    summary: {
      tr: 'Kişisel verilerinizin KVKK kapsamında işlenmesine ilişkin açık rıza metni.',
      en: 'Explicit consent text regarding the processing of your personal data within the scope of KVKK.',
      fr: 'Texte de consentement explicite concernant le traitement de vos données personnelles dans le cadre de la KVKK.',
    },
    isActive: true,
    effectiveDate: new Date('2026-01-01'),
  },
  {
    type: 'privacy_policy',
    version: 1,
    title: {
      tr: 'Aydınlatma Metni',
      en: 'Privacy Notice',
      fr: 'Politique de Confidentialité',
    },
    content: {
      tr: privacyPolicyTr,
      en: privacyPolicyTr,
      fr: privacyPolicyTr,
    },
    summary: {
      tr: 'Kişisel verilerinizin işlenmesi ve KVKK kapsamındaki haklarınız hakkında detaylı bilgi.',
      en: 'Detailed information about the processing of your personal data and your rights under KVKK.',
      fr: 'Informations détaillées sur le traitement de vos données personnelles et vos droits en vertu de la KVKK.',
    },
    isActive: true,
    effectiveDate: new Date('2026-01-01'),
  },
  {
    type: 'terms_of_use',
    version: 1,
    title: {
      tr: 'Kullanım Koşulları ve Üyelik Sözleşmesi',
      en: 'Terms of Use and Membership Agreement',
      fr: "Conditions d'Utilisation et Contrat d'Adhésion",
    },
    content: {
      tr: termsOfUseTr,
      en: termsOfUseTr,
      fr: termsOfUseTr,
    },
    summary: {
      tr: 'Platform kullanım şartları, üyelik kuralları ve tarafların hak ve yükümlülükleri.',
      en: 'Platform terms of use, membership rules, and rights and obligations of the parties.',
      fr: "Conditions d'utilisation de la plateforme, règles d'adhésion et droits et obligations des parties.",
    },
    isActive: true,
    effectiveDate: new Date('2026-01-01'),
  },
  {
    type: 'cookie_policy',
    version: 1,
    title: {
      tr: 'Çerez Politikası',
      en: 'Cookie Policy',
      fr: 'Politique de Cookies',
    },
    content: {
      tr: cookiePolicyTr,
      en: cookiePolicyTr,
      fr: cookiePolicyTr,
    },
    summary: {
      tr: 'Platformda kullanılan çerez türleri ve çerez tercihlerinizi yönetme hakkında bilgi.',
      en: 'Information about the types of cookies used on the platform and how to manage your cookie preferences.',
      fr: "Informations sur les types de cookies utilisés sur la plateforme et comment gérer vos préférences en matière de cookies.",
    },
    isActive: true,
    effectiveDate: new Date('2026-01-01'),
  },
  {
    type: 'commercial_consent',
    version: 1,
    title: {
      tr: 'Ticari Elektronik İleti Onayı',
      en: 'Commercial Electronic Communication Consent',
      fr: 'Consentement aux Communications Électroniques Commerciales',
    },
    content: {
      tr: commercialConsentTr,
      en: commercialConsentTr,
      fr: commercialConsentTr,
    },
    summary: {
      tr: '6563 sayılı ETK kapsamında ticari elektronik ileti alınmasına ilişkin onay belgesi.',
      en: 'Consent form for receiving commercial electronic communications within the scope of Law No. 6563.',
      fr: "Formulaire de consentement pour la réception de communications électroniques commerciales dans le cadre de la loi n° 6563.",
    },
    isActive: true,
    effectiveDate: new Date('2026-01-01'),
  },
];

async function seedLegalDocuments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const LegalDocument = mongoose.model('LegalDocument', LegalDocumentSchema);

    // Mevcut belgeleri temizle
    await LegalDocument.deleteMany({});
    console.log('🗑️ Mevcut belgeler temizlendi');

    // Belgeleri ekle
    for (const doc of documents) {
      await LegalDocument.create(doc);
      console.log(`✅ ${doc.type} (v${doc.version}) eklendi`);
    }

    console.log('\n🎉 Tüm yasal belgeler başarıyla yüklendi!');
    console.log(`📄 Toplam ${documents.length} belge eklendi`);

    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

seedLegalDocuments();
