// Media library in D1: `media` (one row per image) + `media_chunks` (the bytes, in pieces under D1's
// 2 MB row limit). Images are published to /assets/blog/<filename> on the website.
import { all, first, run, batch, newId } from './db.js';

const CHUNK = 900 * 1024;
export const shape = (m) => ({ id: m.id, filename: m.filename, url: '/assets/blog/' + m.filename, alt: m.alt || '', width: m.width || 0, height: m.height || 0, size: m.size, uploadedAt: new Date(m.uploaded_at).toISOString(), contentType: m.content_type });

export const listMedia = async (limit = 500) => (await all('SELECT * FROM media ORDER BY uploaded_at DESC LIMIT ?', limit)).map(shape);
export const findMedia = async (filename) => { const m = await first('SELECT * FROM media WHERE filename = ?', filename); return m ? shape(m) : null; };
export const getMedia = async (id) => { const m = await first('SELECT * FROM media WHERE id = ?', id); return m ? shape(m) : null; };

// D1 returns BLOBs as an ArrayBuffer or an array of bytes depending on the runtime.
const bytes = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : Uint8Array.from(v || []));
// The image bytes (Buffer), or null.
export async function readMedia(filename) {
  const m = await first('SELECT id FROM media WHERE filename = ?', filename);
  if (!m) return null;
  const parts = await all('SELECT data FROM media_chunks WHERE media_id = ? ORDER BY n', m.id);
  return Buffer.concat(parts.map((p) => bytes(p.data)));
}

// Save an image: { filename, contentType, data (Buffer/Uint8Array), alt, width, height, id?, uploadedAt? }.
export async function saveMedia({ filename, contentType, data, alt = '', width = 0, height = 0, id = newId(), uploadedAt = Date.now() }) {
  const buf = bytes(data);
  const list = [['INSERT INTO media (id, filename, content_type, size, alt, width, height, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, filename, contentType, buf.byteLength, String(alt).slice(0, 200), +width || 0, +height || 0, +new Date(uploadedAt)]];
  for (let i = 0, n = 0; i < buf.byteLength || n === 0; i += CHUNK, n++) list.push(['INSERT INTO media_chunks (media_id, n, data) VALUES (?, ?, ?)', id, n, buf.slice(i, i + CHUNK)]);
  await batch(list);
  return getMedia(id);
}
export const setMediaAlt = (id, alt) => run('UPDATE media SET alt = ? WHERE id = ?', String(alt || '').slice(0, 200), id);
export const deleteMedia = (id) => batch([['DELETE FROM media_chunks WHERE media_id = ?', id], ['DELETE FROM media WHERE id = ?', id]]);
// How many posts show this image (in the text or as the featured image).
export async function mediaUsage(filename) {
  const r = await first(`SELECT COUNT(*) AS n FROM posts WHERE instr(content_html, ?) > 0 OR json_extract(doc, '$.featuredImage.src') = ?`, filename, '/assets/blog/' + filename);
  return r ? r.n : 0;
}
