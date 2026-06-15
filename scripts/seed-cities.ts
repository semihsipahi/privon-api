import * as mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/privon';

const CitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    country: { type: String, required: true },
    state: String,
    isCapital: { type: Boolean, default: false },
    isDestination: { type: Boolean, default: false },
    countryCode: String,
  },
  { timestamps: true },
);

CitySchema.index({ name: 1, country: 1 }, { unique: true });

const CityModel = mongoose.model('City', CitySchema);

const CAPITALS = new Set([
  'Ankara', 'London', 'Paris', 'Berlin', 'Rome', 'Madrid',
  'Amsterdam', 'Brussels', 'Vienna', 'Prague', 'Budapest',
  'Dublin', 'Lisbon', 'Copenhagen', 'Stockholm', 'Oslo',
  'Helsinki', 'Athens', 'Warsaw', 'Abu Dhabi', 'Riyadh',
  'Doha', 'Tokyo', 'Beijing', 'Singapore', 'Bangkok',
  'Kuala Lumpur', 'New Delhi', 'Cairo', 'Nairobi', 'Wellington',
  'Buenos Aires', 'Mexico City', 'Bogotá', 'Lima', 'Santiago',
  'Moscow',
]);

const COUNTRY_CODES: Record<string, string> = {
  'United States': 'US', 'United Kingdom': 'GB', 'France': 'FR',
  'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL',
  'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT',
  'Czech Republic': 'CZ', 'Hungary': 'HU', 'Ireland': 'IE',
  'Portugal': 'PT', 'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO',
  'Finland': 'FI', 'Greece': 'GR', 'Poland': 'PL', 'Turkey': 'TR',
  'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Qatar': 'QA',
  'Japan': 'JP', 'China': 'CN', 'Singapore': 'SG', 'Thailand': 'TH',
  'Malaysia': 'MY', 'India': 'IN', 'Egypt': 'EG', 'Kenya': 'KE',
  'South Africa': 'ZA', 'Australia': 'AU', 'New Zealand': 'NZ',
  'Argentina': 'AR', 'Brazil': 'BR', 'Mexico': 'MX', 'Colombia': 'CO',
  'Peru': 'PE', 'Chile': 'CL', 'Russia': 'RU', 'Morocco': 'MA',
  'Indonesia': 'ID', 'Croatia': 'HR', 'Montenegro': 'ME',
  'Botswana': 'BW', 'Jordan': 'JO', 'Tanzania': 'TZ', 'Rwanda': 'RW',
  'Maldives': 'MV', 'Seychelles': 'SC',
};

const CITIES = [
  // ===== TURKIYE =====
  { name: 'Istanbul', country: 'Turkey' },
  { name: 'Ankara', country: 'Turkey' },
  { name: 'Izmir', country: 'Turkey' },
  { name: 'Antalya', country: 'Turkey' },
  { name: 'Bodrum', country: 'Turkey' },
  { name: 'Adana', country: 'Turkey' },
  { name: 'Gaziantep', country: 'Turkey' },
  { name: 'Bursa', country: 'Turkey' },
  { name: 'Trabzon', country: 'Turkey' },
  { name: 'Mersin', country: 'Turkey' },
  { name: 'Eskisehir', country: 'Turkey' },
  { name: 'Kayseri', country: 'Turkey' },
  { name: 'Mugla', country: 'Turkey' },
  { name: 'Fethiye', country: 'Turkey' },
  { name: 'Marmaris', country: 'Turkey' },
  { name: 'Alanya', country: 'Turkey' },
  { name: 'Kusadasi', country: 'Turkey' },
  { name: 'Cesme', country: 'Turkey' },
  { name: 'Denizli', country: 'Turkey' },
  { name: 'Samsun', country: 'Turkey' },
  { name: 'Konya', country: 'Turkey' },
  { name: 'Diyarbakir', country: 'Turkey' },
  { name: 'Hatay', country: 'Turkey' },
  { name: 'Kocaeli', country: 'Turkey' },
  { name: 'Sakarya', country: 'Turkey' },
  { name: 'Malatya', country: 'Turkey' },
  { name: 'Erzurum', country: 'Turkey' },
  { name: 'Cappadocia', country: 'Turkey' },
  { name: 'Pamukkale', country: 'Turkey' },

  // ===== EUROPE =====
  { name: 'London', country: 'United Kingdom' },
  { name: 'Paris', country: 'France' },
  { name: 'Berlin', country: 'Germany' },
  { name: 'Rome', country: 'Italy' },
  { name: 'Madrid', country: 'Spain' },
  { name: 'Amsterdam', country: 'Netherlands' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Vienna', country: 'Austria' },
  { name: 'Prague', country: 'Czech Republic' },
  { name: 'Budapest', country: 'Hungary' },
  { name: 'Dublin', country: 'Ireland' },
  { name: 'Lisbon', country: 'Portugal' },
  { name: 'Copenhagen', country: 'Denmark' },
  { name: 'Stockholm', country: 'Sweden' },
  { name: 'Oslo', country: 'Norway' },
  { name: 'Helsinki', country: 'Finland' },
  { name: 'Athens', country: 'Greece' },
  { name: 'Brussels', country: 'Belgium' },
  { name: 'Warsaw', country: 'Poland' },
  { name: 'Edinburgh', country: 'United Kingdom' },
  { name: 'Milan', country: 'Italy' },
  { name: 'Venice', country: 'Italy' },
  { name: 'Florence', country: 'Italy' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Frankfurt', country: 'Germany' },
  { name: 'Lyon', country: 'France' },
  { name: 'Nice', country: 'France' },
  { name: 'Marseille', country: 'France' },
  { name: 'Zurich', country: 'Switzerland' },
  { name: 'Geneva', country: 'Switzerland' },
  { name: 'Monaco', country: 'Monaco' },
  { name: 'Porto', country: 'Portugal' },
  { name: 'Dubrovnik', country: 'Croatia' },
  { name: 'Moscow', country: 'Russia' },

  // ===== MIDDLE EAST & GULF =====
  { name: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Doha', country: 'Qatar' },
  { name: 'Tel Aviv', country: 'Israel' },

  // ===== ASIA =====
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Kyoto', country: 'Japan' },
  { name: 'Osaka', country: 'Japan' },
  { name: 'Beijing', country: 'China' },
  { name: 'Shanghai', country: 'China' },
  { name: 'Hong Kong', country: 'China' },
  { name: 'Seoul', country: 'South Korea' },
  { name: 'Singapore', country: 'Singapore' },
  { name: 'Bangkok', country: 'Thailand' },
  { name: 'Phuket', country: 'Thailand' },
  { name: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Mumbai', country: 'India' },
  { name: 'New Delhi', country: 'India' },
  { name: 'Baku', country: 'Azerbaijan' },
  { name: 'Tbilisi', country: 'Georgia' },

  // ===== AMERICAS =====
  { name: 'New York', country: 'United States', state: 'New York' },
  { name: 'Los Angeles', country: 'United States', state: 'California' },
  { name: 'Miami', country: 'United States', state: 'Florida' },
  { name: 'San Francisco', country: 'United States', state: 'California' },
  { name: 'Las Vegas', country: 'United States', state: 'Nevada' },
  { name: 'Mexico City', country: 'Mexico' },
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'São Paulo', country: 'Brazil' },
  { name: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Bogotá', country: 'Colombia' },
  { name: 'Lima', country: 'Peru' },
  { name: 'Santiago', country: 'Chile' },
  { name: 'Toronto', country: 'Canada', state: 'Ontario' },
  { name: 'Havana', country: 'Cuba' },

  // ===== AFRICA =====
  { name: 'Cairo', country: 'Egypt' },
  { name: 'Marrakech', country: 'Morocco' },
  { name: 'Casablanca', country: 'Morocco' },
  { name: 'Cape Town', country: 'South Africa' },
  { name: 'Nairobi', country: 'Kenya' },
  { name: 'Kigali', country: 'Rwanda' },

  // ===== OCEANIA =====
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Auckland', country: 'New Zealand' },

  // ===== LEISURE DESTINATIONS =====
  { name: 'Mykonos', country: 'Greece', isDestination: true },
  { name: 'Santorini', country: 'Greece', isDestination: true },
  { name: 'Ibiza', country: 'Spain', isDestination: true },
  { name: 'Mallorca', country: 'Spain', isDestination: true },
  { name: 'Marbella', country: 'Spain', isDestination: true },
  { name: 'Cannes', country: 'France', isDestination: true },
  { name: 'Saint-Tropez', country: 'France', isDestination: true },
  { name: 'St. Moritz', country: 'Switzerland', isDestination: true },
  { name: 'Zermatt', country: 'Switzerland', isDestination: true },
  { name: 'Aspen', country: 'United States', state: 'Colorado', isDestination: true },
  { name: 'Maldives', country: 'Maldives', isDestination: true },
  { name: 'Seychelles', country: 'Seychelles', isDestination: true },
  { name: 'Bora Bora', country: 'French Polynesia', isDestination: true },
  { name: 'Tulum', country: 'Mexico', isDestination: true },
  { name: 'Zanzibar', country: 'Tanzania', isDestination: true },
  { name: 'Masai Mara', country: 'Kenya', isDestination: true },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB: ${MONGO_URI}`);

  await CityModel.deleteMany({});
  console.log('Cleared existing cities');

  let capitalCount = 0;
  let destCount = 0;

  for (const city of CITIES) {
    const isCapital = CAPITALS.has(city.name);
    const isDestination = city.isDestination || false;
    const countryCode = COUNTRY_CODES[city.country] || '';

    await CityModel.create({
      name: city.name,
      country: city.country,
      state: city.state,
      isCapital,
      isDestination,
      countryCode,
    });

    if (isCapital) capitalCount++;
    if (isDestination) destCount++;
  }

  const total = await CityModel.countDocuments();
  console.log(`Seeded ${total} cities`);
  console.log(`Capitals: ${capitalCount}`);
  console.log(`Destinations: ${destCount}`);

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
