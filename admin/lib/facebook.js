// Share newly published posts on the Reelsmith Facebook Page (https://www.facebook.com/reelsmithvdo/).
// Runs after each online publish (the scheduler at :17 and :47 included). A post is shared once, only after its page is
// really live on reelsmithapp.com (so Facebook's link preview finds the page and its image), and only if it went
// live after sharing was switched on — older posts are never shared in bulk.
// Needs two secrets on the reelsmith-admin Worker: FB_PAGE_ID and FB_PAGE_TOKEN (a Page access token with
// pages_manage_posts). Without them this does nothing. Record: settings 'facebook' { since, shared, last }.
import { getSettings, setSettings } from './db.js';
import { allPosts, effectiveStatus } from './posts.js';

const GRAPH = 'https://graph.facebook.com/v27.0';
const SITE = 'https://reelsmithapp.com';
const MAX_TRIES = 3;
const PER_RUN = 2; // a missed day never floods the Page

export const facebookConfigured = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN);
export const postUrl = (p) => `${SITE}/${p.section === 'tutorial' ? 'tutorials' : 'blog'}/${p.slug}/`;
export const postMessage = (p) => [p.title, p.excerpt || p.metaDescription || ''].filter(Boolean).join('\n\n');

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

export async function shareNewPosts({ now = Date.now() } = {}) {
  if (!facebookConfigured()) return null;
  const fb = (await getSettings('facebook')) || {};
  // First run: start 90 minutes back, so a post that went live just now is still shared.
  if (!fb.since) { await setSettings({ since: new Date(now - 90 * 60 * 1000).toISOString(), shared: {} }, 'facebook'); return { shared: [], note: 'switched on — posts that go live from now on will be shared' }; }
  const since = new Date(fb.since).getTime();
  const shared = fb.shared || {};
  const due = (await allPosts())
    .filter((p) => effectiveStatus(p, now) === 'published' && new Date(p.publishAt).getTime() >= since)
    .filter((p) => { const s = shared[p.section + '/' + p.slug]; return !s || (!s.id && (s.tries || 0) < MAX_TRIES); })
    .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt))
    .slice(0, PER_RUN);
  const out = [];
  for (const p of due) {
    const key = p.section + '/' + p.slug, url = postUrl(p);
    if (!(await isLive(url))) { out.push({ key, waiting: 'page not live yet' }); continue; } // next run
    try {
      const r = await graph(`/${process.env.FB_PAGE_ID}/feed`, { message: postMessage(p), link: url }, 'POST');
      shared[key] = { id: r.id, at: new Date().toISOString() };
      out.push({ key, id: r.id });
    } catch (e) {
      shared[key] = { tries: ((shared[key] && shared[key].tries) || 0) + 1, error: e.message, at: new Date().toISOString() };
      out.push({ key, error: e.message });
    }
  }
  const last = out.find((x) => x.id || x.error);
  await setSettings({ shared, ...(last ? { last: { at: new Date().toISOString(), ok: !!last.id, key: last.key, error: last.error || '' } } : {}) }, 'facebook');
  return { shared: out };
}
