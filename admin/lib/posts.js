// Posts and categories in MongoDB.
// status: 'draft' | 'published'. A published post with a future publishAt is "scheduled".
import sanitizeHtml from 'sanitize-html';
import { db, oid } from './db';
import { slugify } from './seo';
import { seoReport } from './score';

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

export async function listPosts({ q, status, section } = {}) {
  const d = await db();
  const find = {};
  if (section) find.section = section;
  if (q) find.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const all = await d.collection('posts').find(find, { projection: { contentHtml: 0 } }).sort({ updatedAt: -1 }).toArray();
  return status ? all.filter((p) => effectiveStatus(p) === status) : all;
}
export async function counts() {
  const all = await listPosts();
  const c = { total: all.length, published: 0, scheduled: 0, draft: 0 };
  for (const p of all) c[effectiveStatus(p)]++;
  return c;
}
export async function getPost(id) { return (await db()).collection('posts').findOne({ _id: oid(id) }); }

export async function savePost(id, input, user) {
  const d = await db();
  const prev = id ? await getPost(id) : null;
  if (id && !prev) throw new Error('Post not found');
  const doc = normalise(input, prev || {});
  const clash = await d.collection('posts').findOne({ section: doc.section, slug: doc.slug, ...(prev ? { _id: { $ne: prev._id } } : {}) });
  if (clash) throw new Error(`Another ${doc.section === 'blog' ? 'blog post' : 'tutorial'} already uses the URL /${doc.slug}/`);
  const now = new Date();
  // The website needs rebuilding when the post is live now, or was live before this change.
  const affectsSite = effectiveStatus(doc) === 'published' || (!!prev && effectiveStatus(prev) === 'published');
  const status = effectiveStatus(doc);
  if (prev) { await d.collection('posts').updateOne({ _id: prev._id }, { $set: { ...doc, updatedAt: now, updatedBy: user.email } }); return { id: prev._id, affectsSite, status }; }
  const r = await d.collection('posts').insertOne({ ...doc, createdAt: now, updatedAt: now, author: 'Reelsmith', createdBy: user.email });
  return { id: r.insertedId, affectsSite, status };
}
export async function deletePost(id) {
  const d = await db();
  const prev = await d.collection('posts').findOne({ _id: oid(id) });
  await d.collection('posts').deleteOne({ _id: oid(id) });
  return { affectsSite: !!prev && effectiveStatus(prev) === 'published' };
}

export async function listCategories() {
  const d = await db();
  const cats = await d.collection('categories').find().sort({ name: 1 }).toArray();
  const used = await d.collection('posts').aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]).toArray();
  return cats.map((c) => ({ ...c, posts: (used.find((u) => u._id === c.slug) || {}).n || 0 }));
}
export async function saveCategory(id, input) {
  const d = await db();
  const name = String(input.name || '').trim().slice(0, 80);
  if (!name) throw new Error('Name is required');
  const slug = slugify(input.slug || name);
  const doc = { name, slug, description: String(input.description || '').trim().slice(0, 300) };
  const clash = await d.collection('categories').findOne({ slug, ...(id ? { _id: { $ne: oid(id) } } : {}) });
  if (clash) throw new Error('A category with that slug already exists');
  if (id) {
    const old = await d.collection('categories').findOne({ _id: oid(id) });
    await d.collection('categories').updateOne({ _id: oid(id) }, { $set: doc });
    if (old && old.slug !== slug) await d.collection('posts').updateMany({ category: old.slug }, { $set: { category: slug } });
    return { affectsSite: !!old && (old.name !== name || old.slug !== slug) };
  }
  await d.collection('categories').insertOne({ ...doc, createdAt: new Date() });
  return { affectsSite: false };
}
export async function deleteCategory(id) {
  const d = await db();
  const c = await d.collection('categories').findOne({ _id: oid(id) });
  if (!c) return;
  const used = await d.collection('posts').countDocuments({ category: c.slug });
  await d.collection('posts').updateMany({ category: c.slug }, { $set: { category: '' } });
  await d.collection('categories').deleteOne({ _id: c._id });
  return { affectsSite: used > 0 };
}
