// Serves /assets/... inside the admin: blog images from MongoDB, everything else from the website folder.
import fs from 'fs';
import path from 'path';
import { db, bucket } from '@/lib/db';

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
export async function GET(req, { params }) {
  const parts = (await params).path || [];
  const rel = parts.join('/');
  if (parts[0] === 'blog' && parts.length === 2) {
    const f = await (await db()).collection('media.files').findOne({ filename: parts[1] });
    if (f) {
      const chunks = []; for await (const c of (await bucket()).openDownloadStream(f._id)) chunks.push(c);
      return new Response(Buffer.concat(chunks), { headers: { 'content-type': f.metadata?.contentType || TYPES[path.extname(f.filename)] || 'application/octet-stream', 'cache-control': 'private, max-age=3600' } });
    }
  }
  if (rel.includes('..')) return new Response('Not found', { status: 404 });
  // On this Mac: read the website folder. Online (no files): fetch the published file from the site.
  const root = path.resolve(process.cwd(), process.env.SITE_SRC || '../src', 'assets');
  const file = path.resolve(root, rel);
  let local = false;
  try { local = file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile(); } catch { local = false; }
  if (local) return new Response(fs.readFileSync(file), { headers: { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'private, max-age=600' } });
  const r = await fetch((process.env.SITE_URL || 'https://reelsmithapp.com') + '/assets/' + rel);
  if (!r.ok) return new Response('Not found', { status: 404 });
  return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'private, max-age=600' } });
}
