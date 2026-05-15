export const MOCK_VENUES = [
  {
    id: 'venue-001',
    slug: 'privon-bosphorus',
    name: 'Privon Bosphorus',
    description: 'Boğaz manzaralı lüks restoran deneyimi.',
    address: {
      city: 'İstanbul',
      district: 'Beşiktaş',
      fullAddress: 'Çırağan Caddesi No:12, Beşiktaş, İstanbul',
    },
    category: 'Fine Dining',
    cuisine: ['Türk', 'Akdeniz'],
    phone: '+902123456789',
    email: 'info@privonbosphorus.com',
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Privon+Bosphorus', order: 1 },
    ],
    rating: 4.8,
    priceLevel: 4,
    bookingFlow: {
      type: 'normal',
    },
    isActive: true,
  },
  {
    id: 'venue-002',
    slug: 'privon-galata',
    name: 'Privon Galata',
    description: 'Tarihi Galata Kulesi manzaralı rooftop deneyimi.',
    address: {
      city: 'İstanbul',
      district: 'Beyoğlu',
      fullAddress: 'Galata Meydanı No:5, Beyoğlu, İstanbul',
    },
    category: 'Rooftop Bar & Restaurant',
    cuisine: ['Fusion', 'Modern Türk'],
    phone: '+902124567890',
    email: 'info@privongalata.com',
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Privon+Galata', order: 1 },
    ],
    rating: 4.6,
    priceLevel: 3,
    bookingFlow: {
      type: 'normal',
    },
    isActive: true,
  },
];
