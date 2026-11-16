// Posts and categories (Cloudflare D1: tables posts, categories — see migrations/0001_init.sql).
// status: 'draft' | 'published'. A published post with a future publishAt is "scheduled".
import sanitizeHtml from 'sanitize-html';
import { all, first, run, batch, newId } from './db.js';
import { slugify } from './seo.js';
import { seoReport } from './score.js';

export const SECTIONS = { blog: 'Blog', tutorial: 'Tutorials' };
export const effectiveStatus = (p, now = Date.now()) => (p.status === 'published' ? (new Date(p.publishAt).getTime() > now ? 'scheduled' : 'published') : 'draft');

// Only safe HTML is stored (the editor produces simple markup; this also protects the website).
export function cleanHtml(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br', 'hr', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attrs) => {
        const ext = /^https?:\/\//.test(attrs.href || '') && !/reelsmithapp\.com/.test(attrs.href);
        return { tagName: 'a', attribs: ext ? { ...attrs, target: '_blank', rel: 'noopener' } : { href: attrs.href, title: attrs.title } };
      },
      img: (tag, attrs) => ({ tagName: 'img', attribs: { ...attrs, loading: 'lazy' } }),
    },
  });
}

export function normalise(input, prev = {}) {
  const title = String(input.title ?? prev.title ?? '').trim().slice(0, 200);
  const section = SECTIONS[input.section] ? input.section : (prev.section || 'blog');
  const slug = slugify(input.slug || title) || prev.slug;
  const status = input.status === 'published' ? 'published' : 'draft';
  const publishAt = input.publishAt ? new Date(input.publishAt) : (prev.publishAt || new Date());
  if (isNaN(publishAt)) throw new Error('Publish date is not valid');
  const keywords = (Array.isArray(input.keywords) ? input.keywords : String(input.keywords || '').split(',')).map((k) => k.trim()).filter(Boolean).slice(0, 20);
  const doc = {
    title, slug, section, status, publishAt, keywords,
    excerpt: String(input.excerpt ?? prev.excerpt ?? '').trim().slice(0, 400),
    metaTitle: String(input.metaTitle ?? prev.metaTitle ?? '').trim().slice(0, 120),
    metaDescription: String(input.metaDescription ?? prev.metaDescription ?? '').trim().slice(0, 300),
    focusKeyword: String(input.focusKeyword ?? prev.focusKeyword ?? '').trim().slice(0, 100),
    synonyms: String(input.synonyms ?? prev.synonyms ?? '').trim().slice(0, 200),
    category: String(input.category ?? prev.category ?? '').trim(),
    featuredImage: input.featuredImage ? { src: String(input.featuredImage.src || ''), alt: String(input.featuredImage.alt || '').slice(0, 200) } : null,
    contentHtml: cleanHtml(input.contentHtml ?? prev.contentHtml ?? ''),
    order: Number.isFinite(+input.order) ? +input.order : (prev.order ?? 99),
  };
  if (!doc.title) throw new Error('Title is required');
  if (!doc.slug) throw new Error('Slug is required');
  doc.seoScore = seoReport(doc).score;
  return doc;
}

// A posts row as the document the rest of the admin uses (same fields as before, _id = id).
const COLS = 'id, section, slug, title, status, publish_at, category, doc, created_at, updated_at';
export function fromRow(r) {
  if (!r) return null;
  let doc = {}; try { doc = JSON.parse(r.doc || '{}'); } catch { /* keep empty */ }
  const p = { ...doc, _id: r.id, section: r.section, slug: r.slug, title: r.title, status: r.status, category: r.category, publishAt: new Date(r.publish_at), createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
  if (r.content_html !== undefined) p.contentHtml = r.content_html;
  return p;
}
// Fields kept in the JSON column (everything that isn't a column of its own).
const COLUMNS = new Set(['_id', 'id', 'section', 'slug', 'title', 'status', 'category', 'publishAt', 'createdAt', 'updatedAt', 'contentHtml']);
const docJson = (p) => JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k]) => !COLUMNS.has(k))));
const ms = (d) => +new Date(d);

// Writes a whole post (insert or replace). Also used by the migration and content scripts.
export async function writePost(p) {
  await run(`INSERT INTO posts (id, section, slug, title, status, publish_at, category, content_html, doc, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET section = excluded.section, slug = excluded.slug, title = excluded.title, status = excluded.status,
      publish_at = excluded.publish_at, category = excluded.category, content_html = excluded.content_html, doc = excluded.doc, updated_at = excluded.updated_at`,
  String(p._id), p.section, p.slug, p.title, p.status, ms(p.publishAt), p.category || '', p.contentHtml || '', docJson(p), ms(p.createdAt || Date.now()), ms(p.updatedAt || Date.now()));
}

export async function listPosts({ q, status, section } = {}) {
  const where = [], params = [];
  if (section) { where.push('section = ?'); params.push(section); }
  if (q) { where.push("title LIKE ? ESCAPE '\\'"); params.push('%' + q.replace(/[\\%_]/g, '\\$&') + '%'); }
  const rows = await all(`SELECT ${COLS} FROM posts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`, ...params);
  const list = rows.map(fromRow);
  return status ? list.filter((p) => effectiveStatus(p) === status) : list;
}
// Every post with its text (for publishing).
export const allPosts = async () => (await all(`SELECT ${COLS}, content_html FROM posts`)).map(fromRow);
export async function counts() {
  const list = await listPosts();
  const c = { total: list.length, published: 0, scheduled: 0, draft: 0 };
  for (const p of list) c[effectiveStatus(p)]++;
  return c;
}
export const getPost = async (id) => fromRow(await first(`SELECT ${COLS}, content_html FROM posts WHERE id = ?`, String(id)));
export const findPost = async (section, slug) => fromRow(await first(`SELECT ${COLS}, content_html FROM posts WHERE section = ? AND slug = ?`, section, slug));

export async function savePost(id, input, user) {
  const prev = id ? await getPost(id) : null;
  if (id && !prev) throw new Error('Post not found');
  const doc = normalise(input, prev || {});
  const clash = await first('SELECT id FROM posts WHERE section = ? AND slug = ? AND id <> ?', doc.section, doc.slug, prev ? prev._id : '');
  if (clash) throw new Error(`Another ${doc.section === 'blog' ? 'blog post' : 'tutorial'} already uses the URL /${doc.slug}/`);
  const now = new Date();
  // The website needs rebuilding when the post is live now, or was live before this change.
  const affectsSite = effectiveStatus(doc) === 'published' || (!!prev && effectiveStatus(prev) === 'published');
  const status = effectiveStatus(doc);
  if (prev) { await writePost({ ...prev, ...doc, updatedAt: now, updatedBy: user.email }); return { id: prev._id, affectsSite, status }; }
  const _id = newId();
  await writePost({ ...doc, _id, createdAt: now, updatedAt: now, author: 'Reelsmith', createdBy: user.email });
  return { id: _id, affectsSite, status };
}
export async function deletePost(id) {
  const prev = await getPost(id);
  await run('DELETE FROM posts WHERE id = ?', String(id));
  return { affectsSite: !!prev && effectiveStatus(prev) === 'published' };
}

const catRow = (c) => ({ _id: c.id, slug: c.slug, name: c.name, description: c.description, createdAt: new Date(c.created_at) });
export async function listCategories() {
  const cats = await all('SELECT * FROM categories ORDER BY name');
  const used = await all('SELECT category, COUNT(*) AS n FROM posts GROUP BY category');
  return cats.map((c) => ({ ...catRow(c), posts: (used.find((u) => u.category === c.slug) || {}).n || 0 }));
}
export async function saveCategory(id, input) {
  const name = String(input.name || '').trim().slice(0, 80);
  if (!name) throw new Error('Name is required');
  const slug = slugify(input.slug || name);
  const description = String(input.description || '').trim().slice(0, 300);
  const clash = await first('SELECT id FROM categories WHERE slug = ? AND id <> ?', slug, id || '');
  if (clash) throw new Error('A category with that slug already exists');
  if (id) {
    const old = await first('SELECT * FROM categories WHERE id = ?', id);
    const list = [['UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?', name, slug, description, id]];
    if (old && old.slug !== slug) list.push(['UPDATE posts SET category = ? WHERE category = ?', slug, old.slug]);
    await batch(list);
    return { affectsSite: !!old && (old.name !== name || old.slug !== slug) };
  }
  await run('INSERT INTO categories (id, slug, name, description, created_at) VALUES (?, ?, ?, ?, ?)', newId(), slug, name, description, Date.now());
  return { affectsSite: false };
}
export async function deleteCategory(id) {
  const c = await first('SELECT * FROM categories WHERE id = ?', id);
  if (!c) return;
  const used = (await first('SELECT COUNT(*) AS n FROM posts WHERE category = ?', c.slug)).n;
  await batch([['UPDATE posts SET category = \'\' WHERE category = ?', c.slug], ['DELETE FROM categories WHERE id = ?', id]]);
  return { affectsSite: used > 0 };
}
