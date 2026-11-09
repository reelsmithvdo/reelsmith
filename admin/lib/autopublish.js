// Automatic publishing: called after a change that affects the live website (a post published, updated,
// unpublished or deleted; a category renamed). Runs in the background so saving stays instant:
//  • Cloudflare: kept alive with ctx.waitUntil after the response is sent.
//  • This Mac: a background promise in the Node server.
// Overlapping changes are coalesced: one run at a time, plus one more if something changed meanwhile.
import { publishSite } from './publish';
import { db } from './db';

let running = null, again = false;
function run() {
  if (running) { again = true; return running; }
  running = (async () => {
    try {
      do { again = false; await publishSite(); } while (again);
    } catch (e) {
      console.error('auto publish failed:', e.message);
      try { await (await db()).collection('settings').updateOne({ _id: 'site' }, { $set: { lastPublish: { at: new Date(), ok: false, auto: true, log: e.message } } }, { upsert: true }); } catch { /* ignore */ }
    } finally { running = null; }
  })();
  return running;
}
export async function autoPublish() {
  const job = run();
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { ctx } = getCloudflareContext();
    if (ctx && ctx.waitUntil) ctx.waitUntil(job);
  } catch { /* not on Cloudflare: the Node server keeps the promise alive */ }
}
