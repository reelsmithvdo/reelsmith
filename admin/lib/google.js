// Google Search Console + Analytics (GA4 Data API) with the service-account key.
import fs from 'fs';
import crypto from 'crypto';

const tokens = new Map();
async function token(scope) {
  const hit = tokens.get(scope);
  if (hit && hit.exp > Date.now() + 60000) return hit.token;
  const k = credentials();
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: k.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(head + '.' + claim), k.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google sign-in failed: ' + (j.error_description || j.error || r.status));
  tokens.set(scope, { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}
// Online (Cloudflare): GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY secrets. On this Mac: the key file.
function credentials() {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"+|"+$/g, '') };
  }
  const file = process.env.GOOGLE_KEY_FILE;
  if (!file || !fs.existsSync(file)) throw new Error('Google credentials not set (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function serviceAccountEmail() {
  try { return credentials().client_email; } catch { return null; }
}

// Small in-memory cache so the dashboard stays fast (Google data changes slowly).
const cache = new Map();
async function cached(key, ms, fn) {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, until: Date.now() + ms });
  return value;
}

const day = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };

async function gsc(path, body) {
  const site = encodeURIComponent(process.env.GSC_SITE);
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: 'Bearer ' + await token('https://www.googleapis.com/auth/webmasters.readonly'), 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Search Console error ' + r.status);
  return j;
}

// Last 28 days (Search Console data lags ~2–3 days), compared with the 28 days before.
export function searchConsole() {
  return cached('gsc', 30 * 60000, async () => {
    const end = daysAgo(2), start = daysAgo(29), pEnd = daysAgo(30), pStart = daysAgo(57);
    const q = (dims, s = start, e = end, rowLimit = 10) => gsc('searchAnalytics/query', { startDate: day(s), endDate: day(e), dimensions: dims, rowLimit, dataState: 'all' });
    const [tot, prev, byDate, queries, pages, countries, devices, sitemaps] = await Promise.all([
      q([]), q([], pStart, pEnd), q(['date'], start, end, 100), q(['query']), q(['page']), q(['country'], start, end, 6), q(['device'], start, end, 5), gsc('sitemaps'),
    ]);
    const t = (tot.rows || [])[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const p = (prev.rows || [])[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const series = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = day(d), row = (byDate.rows || []).find((r) => r.keys[0] === key);
      series.push({ date: key, clicks: row ? row.clicks : 0, impressions: row ? row.impressions : 0 });
    }
    const rows = (r) => (r.rows || []).map((x) => ({ key: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
    return {
      range: { start: day(start), end: day(end) },
      totals: t, previous: p, series,
      queries: rows(queries), pages: rows(pages).map((x) => ({ ...x, key: x.key.replace(/^https?:\/\/[^/]+/, '') || '/' })),
      countries: rows(countries), devices: rows(devices),
      sitemaps: (sitemaps.sitemap || []).map((s) => ({ path: s.path.replace(/^https?:\/\/[^/]+/, ''), errors: +s.errors || 0, warnings: +s.warnings || 0, lastDownloaded: s.lastDownloaded, submitted: (s.contents || []).reduce((a, c) => a + (+c.submitted || 0), 0), indexed: (s.contents || []).reduce((a, c) => a + (+c.indexed || 0), 0) })),
    };
  });
}

async function ga(body) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA_PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + await token('https://www.googleapis.com/auth/analytics.readonly'), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Analytics error ' + r.status);
  return j;
}
// Last 30 days of visitors.
export function analytics() {
  return cached('ga', 15 * 60000, async () => {
    const range = [{ startDate: '30daysAgo', endDate: 'today' }];
    const [tot, countries, pages, devices] = await Promise.all([
      ga({ dateRanges: range, metrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate'].map((name) => ({ name })) }),
      ga({ dateRanges: range, dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], limit: 6, orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] }),
      ga({ dateRanges: range, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], limit: 6, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] }),
      ga({ dateRanges: range, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }], limit: 4 }),
    ]);
    const v = (tot.rows || [])[0]?.metricValues?.map((m) => +m.value) || [0, 0, 0, 0, 0, 0];
    const list = (r) => (r.rows || []).map((x) => ({ key: x.dimensionValues[0].value, value: +x.metricValues[0].value }));
    return { visitors: v[0], newVisitors: v[1], sessions: v[2], pageViews: v[3], avgSession: v[4], engagement: v[5], countries: list(countries), pages: list(pages), devices: list(devices) };
  });
}

// Tell Google the sitemap changed (Search Console "Submit sitemap"). Needs the service account to be an
// Owner or Full user of the property. Returns { ok, status, error? }.
export async function submitSitemap(url = (process.env.SITE_URL || 'https://reelsmithapp.com') + '/sitemap.xml') {
  const site = encodeURIComponent(process.env.GSC_SITE);
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent(url)}`, {
    method: 'PUT', headers: { authorization: 'Bearer ' + await token('https://www.googleapis.com/auth/webmasters') },
  });
  if (r.ok) return { ok: true, status: r.status };
  let error = 'Search Console error ' + r.status;
  try { error = (await r.json()).error?.message || error; } catch { /* not JSON */ }
  return { ok: false, status: r.status, error };
}
