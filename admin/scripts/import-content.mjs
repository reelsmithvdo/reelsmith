// One-time import of the existing Markdown blog posts and tutorials into MongoDB.
// Safe to re-run: posts that already exist (same section + slug) are left untouched.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { MongoClient } from 'mongodb';
import { seoReport } from '../lib/score.js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => /^\w+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const tmp = path.join(fs.mkdtempSync(path.join((await import('os')).tmpdir(), 'rs-import-')), 'content.json');
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-site.js')], { env: { ...process.env, RS_DUMP_CONTENT: tmp } });
const items = JSON.parse(fs.readFileSync(tmp, 'utf8'));

const CATS = [
  { slug: 'tutorials', name: 'Tutorials', description: 'Step-by-step guides for the Reelsmith editor.' },
  { slug: 'news', name: 'News', description: 'Product news and announcements.' },
  { slug: 'tips', name: 'Editing tips', description: 'Practical advice for better videos.' },
];
const BLOG_CAT = { 'introducing-reelsmith': 'news', 'private-video-editing-in-the-browser': 'news', 'editing-tips-for-short-videos': 'tips' };
const FOCUS = {
  'add-subtitles-to-video-automatically': 'add subtitles to video', 'remove-video-background': 'remove video background',
  'vertical-video-for-shorts-reels-tiktok': 'vertical video', 'animated-text-titles': 'animated text', 'make-quiet-audio-louder': 'make audio louder',
  'add-subscribe-button-to-video': 'subscribe button', 'introducing-reelsmith': 'free video editor', 'private-video-editing-in-the-browser': 'video editing in the browser',
  'editing-tips-for-short-videos': 'editing tips',
};

const client = new MongoClient(env.MONGODB_URI);
await client.connect();
const d = client.db(env.MONGODB_DB || 'reelsmith');
for (const c of CATS) await d.collection('categories').updateOne({ slug: c.slug }, { $setOnInsert: { ...c, createdAt: new Date() } }, { upsert: true });
let added = 0, kept = 0;
for (const it of items) {
  if (await d.collection('posts').findOne({ section: it.section, slug: it.slug })) { kept++; continue; }
  const when = new Date((it.date || '2026-11-08') + 'T09:00:00Z');
  const doc = {
    title: it.title, slug: it.slug, section: it.section, status: 'published', publishAt: when,
    excerpt: it.description, metaTitle: '', metaDescription: it.description, focusKeyword: FOCUS[it.slug] || '', keywords: [],
    category: it.section === 'tutorial' ? 'tutorials' : (BLOG_CAT[it.slug] || 'news'),
    featuredImage: it.image ? { src: it.image, alt: it.title } : null, contentHtml: it.html, order: +it.order || 99,
    author: 'Reelsmith', createdAt: when, updatedAt: when, createdBy: 'import',
  };
  doc.seoScore = seoReport(doc).score;
  await d.collection('posts').insertOne(doc);
  added++;
}
console.log(`Imported ${added} posts (${kept} already existed). Categories: ${CATS.map((c) => c.name).join(', ')}.`);
await client.close();
