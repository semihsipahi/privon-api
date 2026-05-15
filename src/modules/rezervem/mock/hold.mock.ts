import { v4 as uuidv4 } from 'uuid';

export function getMockHold(params: {
  slug: string;
  pax: number;
  date: string;
  time: string;
  areaId: string;
}): object {
  const holdId = `hold-${uuidv4()}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return {
    holdId,
    slug: params.slug,
    pax: params.pax,
    date: params.date,
    time: params.time,
    areaId: params.areaId,
    status: 'held',
    expiresAt,
    ttlSeconds: 600,
    paymentScenario: 'A',
  };
}
