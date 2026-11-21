// Facebook sharing: log, queue and missed shares — run at the start of each work session (CLAUDE.md).
//   node --env-file=.env.local scripts/facebook.mjs --live                         → status (read-only)
//   node --env-file=.env.local scripts/facebook.mjs --live --share blog/<slug>     → share that post now
//   node --env-file=.env.local scripts/facebook.mjs --live --share-missed          → share every missed post now
// Sharing needs FB_PAGE_ID and FB_PAGE_TOKEN in the environment (the same values as the Worker secrets;
// e.g. `export $(grep ^FB_ ../creds.txt)` if the owner keeps them there). Status works without them.
import { useD1 } from './d1.mjs';

const proxy = await useD1();
const { getSettings } = await import('../lib/db.js');
const { allPosts, effectiveStatus } = await import('../lib/posts.js');
const { shareQueue, missedShares, shareOne, facebookConfigured } = await import('../lib/facebook.js');

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const dhaka = (d) => new Date(new Date(d).getTime() + 6 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const fb = (await getSettings('facebook')) || {};
const shared = fb.shared || {};
const posts = (await allPosts()).filter((p) => effectiveStatus(p) === 'published');
const find = (key) => posts.find((p) => p.section + '/' + p.slug === key);

const one = arg('--share');
const targets = one ? [find(one)] : process.argv.includes('--share-missed') ? (await missedShares(Date.now(), fb)).map((m) => find(m.key)) : [];
if (one || process.argv.includes('--share-missed')) {
  if (!facebookConfigured()) { console.log('Set FB_PAGE_ID and FB_PAGE_TOKEN first.'); process.exit(1); }
  if (one && !targets[0]) { console.log('No live post', one); process.exit(1); }
  if (!targets.length) console.log('Nothing missed.');
  for (const p of targets) {
    const r = await shareOne(p, { manual: true });
    console.log(r.id ? `shared ${r.key} (${r.id})` : `FAILED ${r.key}: ${r.error}`);
  }
} else {
  console.log(`Sharing started: ${fb.startedAt ? dhaka(fb.startedAt) + ' (Dhaka)' : 'not yet (needs the scheduler with FB secrets)'}`);
  console.log(`Shared: ${Object.values(shared).filter((s) => s.id).length} of ${posts.length} live posts`);
  const missed = await missedShares(Date.now(), fb);
  console.log(`\nMISSED (${missed.length})${missed.length ? ' — share with --share-missed or --share <key>' : ''}`);
  for (const m of missed) console.log(`  ${m.key}  live ${dhaka(m.publishAt)} — ${m.reason}`);
  const q = await shareQueue(Date.now(), shared);
  console.log(`\nQueue (${q.length}, shared 2 a day): ${q.slice(0, 8).map((p) => p.section + '/' + p.slug).join(', ')}${q.length > 8 ? ', …' : ''}`);
  console.log('\nLog (last 15, Dhaka time):');
  for (const l of (fb.log || []).slice(-15)) console.log(`  ${dhaka(l.at)}  ${l.event.padEnd(16)} ${l.key}  ${l.detail || ''}`);
}
await proxy.dispose();
process.exit(0);
