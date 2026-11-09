// MongoDB connection, shared across requests (and kept across hot reloads in development).
import { MongoClient, ObjectId, GridFSBucket } from 'mongodb';

const g = globalThis;
// Cloudflare Workers forbid reusing a connection opened by another request, so there each request gets its
// own client (kept for that request only). On a normal Node server one shared client is reused.
const IN_WORKER = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const perRequest = new WeakMap();
async function requestKey() {
  try { const { getCloudflareContext } = await import('@opennextjs/cloudflare'); return getCloudflareContext().ctx || null; } catch { return null; }
}
export async function db() {
  if (IN_WORKER) {
    const key = await requestKey();
    if (key && perRequest.has(key)) return perRequest.get(key);
    const p = open({ maxPoolSize: 1 }, false);
    if (key) perRequest.set(key, p);
    return p;
  }
  if (!g.__rsDb) g.__rsDb = open({}, true).catch((e) => { g.__rsDb = null; throw e; });
  return g.__rsDb;
}
// indexes: create them once per server start (not on every Cloudflare request).
async function open(extra, indexes) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  const c = await new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, ...extra }).connect();
  const d = c.db(process.env.MONGODB_DB || 'reelsmith');
  if (indexes) {
    await Promise.all([
        d.collection('posts').createIndex({ section: 1, slug: 1 }, { unique: true }),
        d.collection('posts').createIndex({ updatedAt: -1 }),
        d.collection('categories').createIndex({ slug: 1 }, { unique: true }),
        d.collection('media.files').createIndex({ filename: 1 }),
    ]).catch(() => {});
  }
  return d;
}
export async function bucket() { return new GridFSBucket(await db(), { bucketName: 'media' }); }
export const oid = (id) => { try { return new ObjectId(String(id)); } catch { return null; } };
// Plain JSON for client components.
export const plain = (doc) => JSON.parse(JSON.stringify(doc));
