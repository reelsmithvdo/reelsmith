// Share the website's posts on the Reelsmith Facebook Page (https://www.facebook.com/reelsmithvdo/), one at a time.
// Runs after each online publish (the scheduler at :17 and :47 included). Every live post is shared once, at most
// 2 per day (Asia/Dhaka), at least 6 hours apart, between 10:00 and 22:00 — so the Page never looks like spam.
// A post that went live in the last 2 days goes first; older posts follow, oldest first. A post is shared only once
// its page is really live (Facebook's link preview reads the page's og: tags for the featured image).
// Each share: title + meta description as the text, the link as the attachment.
// Needs two secrets on the reelsmith-admin Worker: FB_PAGE_ID and FB_PAGE_TOKEN (a Page access token with
// pages_manage_posts). Without them this does nothing.
// Record: settings 'facebook' { startedAt, shared: {key: {id|error,tries,at}}, last, log: [{at, key, event, detail}] }.
// Missed shares (missedShares) are listed in admin Settings and by `scripts/facebook.mjs --live`, which can also
// share one by hand (`--share <section/slug>`). Check them at the start of each work session (CLAUDE.md).
import { getSettings, setSettings } from './db.js';
import { allPosts, effectiveStatus } from './posts.js';

const GRAPH = 'https://graph.facebook.com/v27.0';
const SITE = 'https://reelsmithapp.com';
const MAX_TRIES = 3;
const PER_DAY = 2;
const GAP = 6 * 3600 * 1000;         // between two shares
const HOURS = [10, 22];             // Dhaka local time window
const TZ = 6 * 3600 * 1000;          // Asia/Dhaka = UTC+6, no daylight saving
const FRESH = 2 * 86400 * 1000;      // "new" post: went live in the last 2 days
const LATE = 24 * 3600 * 1000;       // a post live this long after sharing started and still not shared = missed
const LOG_MAX = 300;

export const facebookConfigured = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN);
export const postUrl = (p) => `${SITE}/${p.section === 'tutorial' ? 'tutorials' : 'blog'}/${p.slug}/`;
export const postMessage = (p) => [p.title, p.metaDescription || p.excerpt || ''].filter(Boolean).join('\n\n');

async function graph(path, params, method = 'GET') {
  const body = new URLSearchParams({ ...params, access_token: process.env.FB_PAGE_TOKEN });
  const r = method === 'GET' ? await fetch(`${GRAPH}${path}?${body}`) : await fetch(`${GRAPH}${path}`, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && j.error.message) || 'Facebook HTTP ' + r.status);
  return j;
}

// For the Settings page: the Page's name if the token works.
export async function facebookStatus() {
  if (!facebookConfigured()) throw new Error('Not set up (FB_PAGE_ID and FB_PAGE_TOKEN secrets)');
  return graph('/' + process.env.FB_PAGE_ID, { fields: 'name' });
}

const isLive = async (url) => { try { const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'reelsmith-admin' } }); return r.status === 200; } catch { return false; } };

const day = (t) => new Date(t + TZ).toISOString().slice(0, 10);   // Dhaka date
const hour = (t) => new Date(t + TZ).getUTCHours();

// The queue: live posts not shared yet (or failed fewer than MAX_TRIES times), in sharing order.
export async function shareQueue(now = Date.now(), shared = {}) {
  const live = (await allPosts()).filter((p) => effectiveStatus(p, now) === 'published');
  const waiting = live.filter((p) => { const s = shared[p.section + '/' + p.slug]; return !s || (!s.id && (s.tries || 0) < MAX_TRIES); });
  const t = (p) => new Date(p.publishAt).getTime();
  const fresh = waiting.filter((p) => now - t(p) < FRESH).sort((a, b) => t(b) - t(a));
  const old = waiting.filter((p) => now - t(p) >= FRESH).sort((a, b) => t(a) - t(b));
  return [...fresh, ...old];
}

const keyOf = (p) => p.section + '/' + p.slug;
const addLog = (fb, now, key, event, detail = '') => [...(fb.log || []), { at: new Date(now).toISOString(), key, event, detail }].slice(-LOG_MAX);

// Posts Facebook missed: failed MAX_TRIES times, or went live after sharing started and were not shared within a day
// (e.g. the scheduler didn't run, or the queue was full). Older posts still waiting in the backlog are not "missed".
export async function missedShares(now = Date.now(), fb = {}) {
  const shared = fb.shared || {}, started = fb.startedAt ? new Date(fb.startedAt).getTime() : now;
  return (await allPosts()).filter((p) => effectiveStatus(p, now) === 'published').map((p) => {
    const s = shared[keyOf(p)], t = new Date(p.publishAt).getTime();
    if (s && s.id) return null;
    if (s && (s.tries || 0) >= MAX_TRIES) return { key: keyOf(p), title: p.title, publishAt: p.publishAt, reason: 'failed ' + s.tries + '× — ' + s.error };
    if (t >= started && now - t > LATE) return { key: keyOf(p), title: p.title, publishAt: p.publishAt, reason: 'not shared within a day of going live' + (s && s.error ? ' (last error: ' + s.error + ')' : '') };
    return null;
  }).filter(Boolean);
}

// Share one post now (also used by scripts/facebook.mjs --share). Records the result and logs it.
export async function shareOne(p, { now = Date.now(), fb = null, manual = false } = {}) {
  fb = fb || (await getSettings('facebook')) || {};
  const shared = fb.shared || {}, key = keyOf(p), url = postUrl(p);
  let out;
  try {
    const r = await graph(`/${process.env.FB_PAGE_ID}/feed`, { message: postMessage(p), link: url }, 'POST');
    shared[key] = { id: r.id, at: new Date(now).toISOString() };
    out = { key, id: r.id };
  } catch (e) {
    const tries = ((shared[key] && shared[key].tries) || 0) + 1;
    shared[key] = { tries, error: e.message, at: new Date(now).toISOString() };
    out = { key, error: e.message, gaveUp: tries >= MAX_TRIES };
  }
  const event = out.id ? (manual ? 'shared by hand' : 'shared') : out.gaveUp ? 'MISSED (gave up)' : 'error';
  await setSettings({ shared, since: undefined, startedAt: fb.startedAt || new Date(now).toISOString(), log: addLog(fb, now, key, event, out.id || out.error), last: { at: new Date(now).toISOString(), ok: !!out.id, key, error: out.error || '' } }, 'facebook');
  return out;
}

export async function shareNewPosts({ now = Date.now() } = {}) {
  if (!facebookConfigured()) return null;
  const fb = (await getSettings('facebook')) || {};
  if (!fb.startedAt) { fb.startedAt = new Date(now).toISOString(); await setSettings({ startedAt: fb.startedAt, log: addLog(fb, now, '-', 'sharing started') }, 'facebook'); }
  const shared = fb.shared || {};
  const done = Object.values(shared).filter((s) => s.id).map((s) => new Date(s.at).getTime());
  const today = done.filter((t) => day(t) === day(now)).length;
  const lastAt = done.length ? Math.max(...done) : 0;
  if (hour(now) < HOURS[0] || hour(now) >= HOURS[1]) return { wait: 'outside 10:00–22:00 Dhaka' };
  if (today >= PER_DAY) return { wait: `already ${PER_DAY} shares today` };
  if (now - lastAt < GAP) return { wait: 'less than 6 hours since the last share' };
  const [p] = await shareQueue(now, shared);
  if (!p) return { wait: 'nothing to share' };
  if (!(await isLive(postUrl(p)))) return { key: keyOf(p), wait: 'page not live yet' }; // next run (a new post isn't skipped)
  return shareOne(p, { now, fb });
}
