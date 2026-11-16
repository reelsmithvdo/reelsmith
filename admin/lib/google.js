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

async function ga(body, method = 'runReport') {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA_PROPERTY_ID}:${method}`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + await token('https://www.googleapis.com/auth/analytics.readonly'), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Analytics error ' + r.status);
  return j;
}
// Visitors right now (last 30 minutes). Cached briefly so reloading the dashboard stays cheap.
export function analyticsRealtime() {
  return cached('ga-rt', 60000, async () => {
    const [tot, pages] = await Promise.all([
      ga({ metrics: [{ name: 'activeUsers' }] }, 'runRealtimeReport'),
      ga({ dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], limit: 5 }, 'runRealtimeReport'),
    ]);
    return { now: +((tot.rows || [])[0]?.metricValues?.[0]?.value || 0), pages: (pages.rows || []).map((x) => ({ key: x.dimensionValues[0].value, value: +x.metricValues[0].value })) };
  });
}
// Last 30 days of visitors, compared with the 30 days before, plus daily numbers, traffic sources and site-search terms.
export function analytics() {
  return cached('ga', 15 * 60000, async () => {
    const range = [{ startDate: '29daysAgo', endDate: 'today' }];
    const both = [...range, { startDate: '59daysAgo', endDate: '30daysAgo' }];
    const top = (dim, metric, limit = 6, extra = {}) => ga({ dateRanges: range, dimensions: [{ name: dim }], metrics: [{ name: metric }], limit, orderBys: [{ metric: { metricName: metric }, desc: true }], ...extra });
    const M = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate'];
    const [tot, byDate, countries, pages, devices, channels, sources, searches] = await Promise.all([
      ga({ dateRanges: both, metrics: M.map((name) => ({ name })) }),
      ga({ dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], limit: 100 }),
      top('country', 'activeUsers'),
      top('pagePath', 'screenPageViews', 8),
      top('deviceCategory', 'activeUsers', 4),
      top('sessionDefaultChannelGroup', 'sessions'),
      top('sessionSource', 'sessions'),
      top('searchTerm', 'eventCount', 8, { dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'search' } } } }),
    ]);
    // With two date ranges GA adds a "dateRange" dimension: date_range_0 = now, date_range_1 = before.
    const pick = (name) => (tot.rows || []).find((r) => r.dimensionValues?.[0]?.value === name)?.metricValues?.map((m) => +m.value) || M.map(() => 0);
    const v = pick('date_range_0'), p = pick('date_range_1');
    const obj = (a) => ({ visitors: a[0], newVisitors: a[1], sessions: a[2], pageViews: a[3], avgSession: a[4], engagement: a[5] });
    // Days in the property's time zone (Bangladesh), as GA reports them.
    const day = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const key = day(new Date(Date.now() - i * 86400000)), row = (byDate.rows || []).find((r) => r.dimensionValues[0].value === key.replace(/-/g, ''));
      series.push({ date: key, visitors: row ? +row.metricValues[0].value : 0, pageViews: row ? +row.metricValues[1].value : 0 });
    }
    const list = (r) => (r.rows || []).map((x) => ({ key: x.dimensionValues[0].value, value: +x.metricValues[0].value }));
    return { ...obj(v), previous: obj(p), series, countries: list(countries), pages: list(pages).filter((x) => !x.key.startsWith('/admin')).slice(0, 6), devices: list(devices), channels: list(channels), sources: list(sources), searches: list(searches).filter((x) => x.key && x.key !== '(not set)') };
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
