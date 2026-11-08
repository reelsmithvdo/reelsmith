// Reelsmith website (Cloudflare Worker).
// Static files in ./src are served directly by Cloudflare (free, not counted against the Worker).
// This script only runs for paths that are not files, e.g. POST /api/feedback, which turns a bug report
// or feature request into a GitHub issue.
//
// Setup (once, in the Cloudflare dashboard → reelsmith → Settings → Variables and Secrets):
//   GITHUB_TOKEN  (Secret)  fine-grained token with "Issues: Read and write" on the feedback repo
//   FEEDBACK_REPO (Text)    set in wrangler.jsonc, e.g. reelsmithvdo/reelsmith-feedback (keep it PRIVATE)

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Stop accidental @mentions / issue links pinging people, and cap lengths.
const clean = (s, max) => String(s || '').slice(0, max).replace(/@/g, '@​').replace(/\r/g, '');

async function rateLimited(ip) {
  // Per-location, best effort: at most 5 reports per IP per 10 minutes.
  const cache = caches.default;
  const key = new Request('https://rate.reelsmith.internal/' + encodeURIComponent(ip));
  const hit = await cache.match(key);
  const n = hit ? +(await hit.text()) : 0;
  if (n >= 5) return true;
  await cache.put(key, new Response(String(n + 1), { headers: { 'cache-control': 'max-age=600' } }));
  return false;
}

async function feedback(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  if (+(request.headers.get('content-length') || 0) > 64 * 1024) return json({ ok: false, error: 'Too large' }, 413);
  let p;
  try { p = await request.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  // Bots fill the hidden field or submit instantly; pretend success so they do not retry.
  if (p.website || (p.elapsed != null && p.elapsed < 2500)) return json({ ok: true });
  const kind = p.kind === 'feature' ? 'feature' : 'bug';
  const title = clean(p.title, 140).replace(/\s+/g, ' ').trim();
  const body = clean(p.body, 6000).trim();
  if (title.length < 4 || body.length < 10) return json({ ok: false, error: 'Please add a title and a description' }, 400);
  if (!env.GITHUB_TOKEN || !env.FEEDBACK_REPO) return json({ ok: false, error: 'Feedback is not set up yet' }, 503);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (await rateLimited(ip)) return json({ ok: false, error: 'Too many reports — please wait a few minutes' }, 429);

  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '') ? String(p.email).slice(0, 200) : '';
  const diag = p.diagnostics && typeof p.diagnostics === 'object' ? clean(JSON.stringify(p.diagnostics, null, 2), 8000) : '';
  const country = (request.cf && request.cf.country) || '';
  const md = [
    body,
    '',
    '---',
    email ? `**Reply to:** ${email.replace(/@/g, ' [at] ')}` : '_No email given._',
    country ? `**Country:** ${country}` : '',
    diag ? `\n<details><summary>Technical details</summary>\n\n\`\`\`json\n${diag.replace(/```/g, '´´´')}\n\`\`\`\n</details>` : '',
  ].filter(Boolean).join('\n');

  const r = await fetch(`https://api.github.com/repos/${env.FEEDBACK_REPO}/issues`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.GITHUB_TOKEN,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'reelsmith-feedback',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ title: (kind === 'bug' ? '[Bug] ' : '[Feature] ') + title, body: md, labels: [kind === 'bug' ? 'bug' : 'enhancement'] }),
  });
  if (!r.ok) {
    console.log('GitHub issue failed', r.status, await r.text());
    return json({ ok: false, error: 'Could not save the report' }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/feedback') return feedback(request, env);
    return env.ASSETS.fetch(request);
  },
};
