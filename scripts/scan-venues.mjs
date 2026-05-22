#!/usr/bin/env node
// Tum Rezervem mekanlarini tarar, odeme tipine gore siniflandirir.
// Kullanim: node scripts/scan-venues.mjs <clientId> <clientSecret>

const BASE_URL = 'https://partnerapi.rezervem.com.tr';
const [, , clientId, clientSecret] = process.argv;

if (!clientId || !clientSecret) {
  console.error('Kullanim: node scripts/scan-venues.mjs <clientId> <clientSecret>');
  process.exit(1);
}

async function getToken() {
  const res = await fetch(`${BASE_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ GrantType: 'client_credentials', ClientId: clientId, ClientSecret: clientSecret }),
  });
  const data = await res.json();
  return data.accessToken;
}

async function getVenues(token) {
  const res = await fetch(`${BASE_URL}/v1/venues?page=1&pageSize=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.items ?? data ?? [];
}

async function getBootstrap(token, slug) {
  try {
    const res = await fetch(`${BASE_URL}/v1/venues/${slug}/bootstrap`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.result ?? data;
  } catch {
    return null;
  }
}

function classifyPayment(bootstrap) {
  const pp = bootstrap?.paymentPreview?.mayRequire;
  if (!pp) return 'free';
  if (pp.prepayment) return 'prepayment';
  if (pp.preauth) return 'preauth';
  return 'free';
}

async function main() {
  console.log('Token aliniyor...');
  const token = await getToken();
  console.log('Token OK\n');

  const venues = await getVenues(token);
  console.log(`${venues.length} mekan bulundu. Bootstrap taranıyor...\n`);

  const results = { free: [], prepayment: [], preauth: [], unknown: [] };

  for (const venue of venues) {
    process.stdout.write(`  ${venue.slug.padEnd(40)} `);
    const bootstrap = await getBootstrap(token, venue.slug);
    const type = bootstrap ? classifyPayment(bootstrap) : 'unknown';
    results[type].push({ slug: venue.slug, name: venue.name });
    console.log(`→ ${type}`);
    await new Promise(r => setTimeout(r, 120)); // rate limit
  }

  console.log('\n========================================');
  console.log(`UCRETSIZ (${results.free.length}):`);
  results.free.forEach(v => console.log(`  ${v.slug.padEnd(40)} ${v.name}`));

  console.log(`\nPRE-AUTH / PROVISION (${results.preauth.length}):`);
  results.preauth.forEach(v => console.log(`  ${v.slug.padEnd(40)} ${v.name}`));

  console.log(`\nPREPAYMENT / ON ODEME (${results.prepayment.length}):`);
  results.prepayment.forEach(v => console.log(`  ${v.slug.padEnd(40)} ${v.name}`));

  if (results.unknown.length) {
    console.log(`\nBILINMEYEN (${results.unknown.length}):`);
    results.unknown.forEach(v => console.log(`  ${v.slug}`));
  }
  console.log('========================================');
}

main().catch(console.error);
