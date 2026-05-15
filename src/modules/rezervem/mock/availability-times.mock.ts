export function getMockAvailableTimes(slug: string, pax: number, date: string): object {
  const slots = [
    { time: '12:00', available: true, areas: ['main', 'terrace'] },
    { time: '12:30', available: true, areas: ['main'] },
    { time: '13:00', available: false, areas: [] },
    { time: '13:30', available: true, areas: ['main', 'terrace', 'private'] },
    { time: '19:00', available: true, areas: ['main', 'terrace', 'private'] },
    { time: '19:30', available: true, areas: ['main', 'terrace'] },
    { time: '20:00', available: true, areas: ['main', 'private'] },
    { time: '20:30', available: false, areas: [] },
    { time: '21:00', available: true, areas: ['main'] },
    { time: '21:30', available: true, areas: ['main', 'terrace'] },
  ];

  return {
    slug,
    pax,
    date,
    slots,
  };
}
