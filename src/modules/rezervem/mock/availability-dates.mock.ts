// Returns available dates for next 30 days (weekends excluded for demo variety)
export function getMockAvailableDates(slug: string, pax: number): object {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const day = d.getDay();
    // Exclude mondays (1) to simulate some unavailability
    if (day !== 1) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  return {
    slug,
    pax,
    availableDates: dates,
  };
}
