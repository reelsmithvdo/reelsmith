// The admin's database: Cloudflare D1 (SQLite), binding "DB" in wrangler.jsonc. Schema: migrations/*.sql.
//  • Online: the Worker's D1 binding.
//  • This Mac (`npm run dev`): OpenNext's dev hook (next.config.mjs) gives the same binding backed by a local
//    copy in .wrangler/state, so local work never touches the live database.
//  • Node scripts (scripts/*.mjs): call useD1() from scripts/d1.mjs first, which sets globalThis.__rsD1.
import crypto from 'crypto';

export async function d1() {
  if (globalThis.__rsD1) return globalThis.__rsD1;
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error('D1 database binding "DB" is missing (wrangler.jsonc)');
  return env.DB;
}
const stmt = async (sql, params) => (await d1()).prepare(sql).bind(...params);
export const all = async (sql, ...params) => (await (await stmt(sql, params)).all()).results;
export const first = async (sql, ...params) => (await stmt(sql, params)).first();
export const run = async (sql, ...params) => (await stmt(sql, params)).run();
// Several statements in one transaction: batch([[sql, ...params], …]).
export async function batch(list) {
  const db = await d1();
  return db.batch(list.map(([sql, ...params]) => db.prepare(sql).bind(...params)));
}

// New ids look like the old MongoDB ids (24 hex characters), so links to existing posts keep working.
export const newId = () => crypto.randomBytes(12).toString('hex');
// Plain JSON for client components.
export const plain = (doc) => JSON.parse(JSON.stringify(doc));
const parse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

// settings / users: one small JSON document per id.
export async function getDoc(table, id) {
  const r = await first(`SELECT doc FROM ${table} WHERE id = ?`, id);
  return r ? { _id: id, ...parse(r.doc) } : null;
}
// Merge fields into the document (creating it if needed); a field set to undefined is removed.
export async function setDoc(table, id, fields) {
  const cur = (await getDoc(table, id)) || {};
  delete cur._id;
  const next = { ...cur, ...fields };
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  await run(`INSERT INTO ${table} (id, doc) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET doc = excluded.doc`, id, JSON.stringify(next));
  return { _id: id, ...next };
}
export const getSettings = (id = 'site') => getDoc('settings', id);
export const setSettings = (fields, id = 'site') => setDoc('settings', id, fields);
