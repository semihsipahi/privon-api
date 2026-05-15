export function getMockAvailableAreas(slug: string, pax: number, date: string, time: string): object {
  const areas = [
    {
      id: 'area-main',
      name: 'Ana Salon',
      description: 'Geniş ve ferah ana yemek salonu.',
      minPax: 1,
      maxPax: 10,
      available: true,
      imageUrl: 'https://via.placeholder.com/400x300?text=Ana+Salon',
    },
    {
      id: 'area-terrace',
      name: 'Teras',
      description: 'Açık hava teras — boğaz manzaralı.',
      minPax: 2,
      maxPax: 8,
      available: pax >= 2,
      imageUrl: 'https://via.placeholder.com/400x300?text=Teras',
    },
    {
      id: 'area-private',
      name: 'Özel Oda',
      description: 'Tamamen özel, özel etkinlikler için ideal.',
      minPax: 4,
      maxPax: 10,
      available: pax >= 4,
      imageUrl: 'https://via.placeholder.com/400x300?text=Ozel+Oda',
    },
  ];

  return {
    slug,
    pax,
    date,
    time,
    areas,
  };
}
