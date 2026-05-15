export const MOCK_BOOTSTRAP: Record<string, object> = {
  'privon-bosphorus': {
    venueId: 'venue-001',
    slug: 'privon-bosphorus',
    name: 'Privon Bosphorus',
    bookingFlow: {
      type: 'normal',
      steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'],
    },
    paxOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    minPax: 1,
    maxPax: 10,
    currency: 'TRY',
    holdTtlSeconds: 600,
    policies: {
      cancellationPolicy: '24 saat öncesine kadar ücretsiz iptal.',
      childrenPolicy: 'Çocuklar kabul edilmektedir.',
      dressCode: 'Smart casual',
    },
  },
  'privon-galata': {
    venueId: 'venue-002',
    slug: 'privon-galata',
    name: 'Privon Galata',
    bookingFlow: {
      type: 'normal',
      steps: ['pax', 'date', 'time', 'area', 'hold', 'confirm'],
    },
    paxOptions: [1, 2, 3, 4, 5, 6],
    minPax: 1,
    maxPax: 6,
    currency: 'TRY',
    holdTtlSeconds: 600,
    policies: {
      cancellationPolicy: '48 saat öncesine kadar ücretsiz iptal.',
      childrenPolicy: 'Çocuklar kabul edilmektedir.',
      dressCode: 'Smart casual',
    },
  },
};

export function getMockBootstrap(slug: string): object | null {
  return MOCK_BOOTSTRAP[slug] ?? null;
}
