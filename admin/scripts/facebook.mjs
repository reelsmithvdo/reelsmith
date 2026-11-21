// Facebook sharing: log, queue and missed shares — run at the start of each work session (CLAUDE.md).
//   node --env-file=.env.local scripts/facebook.mjs --live                         → status (read-only)
//   node --env-file=.env.local scripts/facebook.mjs --live --share blog/<slug>     → share that post now
//   node --env-file=.env.local scripts/facebook.mjs --live --share-missed          → share every missed post now
//   node --env-file=.env.local scripts/facebook.mjs --live --schedule-backlog [--dry-run]
//        → schedule the waiting (already live) posts in Facebook's own Scheduled tab: from tomorrow, 10:30 and 16:30 Dhaka,
//          only 16:30 on days a new post goes live (that one is shared directly ~10:47). Max 2 a day, as always.
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
if (process.argv.includes('--schedule-backlog')) {
  const dry = process.argv.includes('--dry-run');
  if (!dry && !facebookConfigured()) { console.log('Set FB_PAGE_ID and FB_PAGE_TOKEN first.'); process.exit(1); }
  const all = await allPosts();
  const newDays = new Set(all.filter((p) => p.status === 'published' && new Date(p.publishAt) > new Date()).map((p) => dhaka(p.publishAt).slice(0, 10)));
  const q = (await shareQueue(Date.now(), shared)).filter((p) => Date.now() - new Date(p.publishAt).getTime() > 2 * 86400e3);
  const slots = [];
  for (let d = 1; slots.length < q.length; d++) {
    const date = new Date(Date.now() + 6 * 3600e3 + d * 86400e3).toISOString().slice(0, 10);
    for (const hm of newDays.has(date) ? ['16:30'] : ['10:30', '16:30']) slots.push(new Date(`${date}T${hm}:00+06:00`));
  }
  for (let i = 0; i < q.length; i++) {
    const p = q[i], key = p.section + '/' + p.slug;
    if (dry) { console.log(`${dhaka(slots[i])}  ${key}`); continue; }
    const r = await shareOne(p, { at: slots[i], manual: true });
    console.log(r.id ? `scheduled ${dhaka(slots[i])}  ${key}  (${r.id})` : `FAILED ${key}: ${r.error}`);
  }
} else if (one || process.argv.includes('--share-missed')) {
  if (!facebookConfigured()) { console.log('Set FB_PAGE_ID and FB_PAGE_TOKEN first.'); process.exit(1); }
  if (one && !targets[0]) { console.log('No live post', one); process.exit(1); }
  if (!targets.length) console.log('Nothing missed.');
  for (const p of targets) {
    const r = await shareOne(p, { manual: true });
    console.log(r.id ? `shared ${r.key} (${r.id})` : `FAILED ${r.key}: ${r.error}`);
  }
} else {
  console.log(`Sharing started: ${fb.startedAt ? dhaka(fb.startedAt) + ' (Dhaka)' : 'not yet (needs the scheduler with FB secrets)'}`);
  console.log(`Shared: ${Object.values(shared).filter((s) => s.id && !(s.scheduled && new Date(s.at) > new Date())).length} of ${posts.length} live posts`);
  const sch = Object.entries(shared).filter(([, s]) => s.scheduled && new Date(s.at) > new Date()).sort((a, b) => a[1].at.localeCompare(b[1].at));
  if (sch.length) { console.log(`\nScheduled on Facebook (${sch.length}):`); for (const [k, s] of sch) console.log(`  ${dhaka(s.at)}  ${k}`); }
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
