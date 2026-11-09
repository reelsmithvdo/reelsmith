// Publish: turn the live posts (Published, publish date reached) into content/posts.json + images, then
// update the website.
//  • On this Mac: write the files into the website folder and run scripts/build-site.js (preview locally;
//    commit + push to go live).
//  • Online (Cloudflare, no files): commit posts.json and new images to GitHub in one commit. Cloudflare
//    rebuilds and deploys the website from that commit (wrangler.jsonc build command) in about a minute.
import fs from 'fs';
import path from 'path';
import { db, bucket } from './db';
import { effectiveStatus } from './posts';

const ROOT = () => path.resolve(process.cwd(), '..');
const SRC = () => path.resolve(process.cwd(), process.env.SITE_SRC || '../src');
const localSite = () => { try { return !process.env.GITHUB_TOKEN && fs.existsSync(path.join(ROOT(), 'scripts', 'build-site.js')); } catch { return false; } };

async function collect() {
  const d = await db();
  const posts = (await d.collection('posts').find().toArray()).filter((p) => effectiveStatus(p) === 'published');
  const cats = await d.collection('categories').find().toArray();
  const catName = (s) => (cats.find((c) => c.slug === s) || {}).name || '';
  const images = new Set();
  for (const p of posts) {
    for (const m of String(p.contentHtml || '').matchAll(/\/assets\/blog\/([\w.-]+)/g)) images.add(m[1]);
    const f = p.featuredImage && p.featuredImage.src && p.featuredImage.src.match(/\/assets\/blog\/([\w.-]+)/); if (f) images.add(f[1]);
  }
  const out = posts.map((p) => ({
    section: p.section, slug: p.slug, title: p.title, metaTitle: p.metaTitle || '', description: p.metaDescription || p.excerpt || '',
    excerpt: p.excerpt || '', date: new Date(p.publishAt).toISOString().slice(0, 10), updated: new Date(p.updatedAt || p.publishAt).toISOString().slice(0, 10),
    image: (p.featuredImage && p.featuredImage.src) || '', imageAlt: (p.featuredImage && p.featuredImage.alt) || '', category: p.category || '', categoryName: catName(p.category),
    keywords: p.keywords || [], order: p.order ?? 99, html: p.contentHtml || '',
  })).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return { d, posts: out, images: [...images] };
}
async function readImage(d, name) {
  const file = await d.collection('media.files').findOne({ filename: name });
  if (!file) return null;
  const chunks = []; for await (const c of (await bucket()).openDownloadStream(file._id)) chunks.push(c);
  return Buffer.concat(chunks);
}
const json = (posts) => JSON.stringify({ posts }, null, 1) + '\n';

async function publishLocal() {
  const { d, posts, images } = await collect();
  const dir = path.join(SRC(), 'assets', 'blog'); fs.mkdirSync(dir, { recursive: true });
  let copied = 0;
  for (const name of images) {
    const dest = path.join(dir, name);
    if (fs.existsSync(dest)) continue;
    const buf = await readImage(d, name); if (!buf) continue;
    fs.writeFileSync(dest, buf); copied++;
  }
  fs.writeFileSync(path.join(ROOT(), 'content', 'posts.json'), json(posts));
  const { execFile } = await import('child_process');
  const log = await new Promise((res) => execFile(process.execPath, [path.join(ROOT(), 'scripts', 'build-site.js')], { cwd: ROOT() }, (err, so, se) => res({ ok: !err, text: (so + se).trim() })));
  return { d, result: { mode: 'local', posts: posts.length, images: copied, ok: log.ok, log: log.text } };
}

async function gh(method, url, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPO + url, {
    method, headers: { authorization: 'Bearer ' + process.env.GITHUB_TOKEN, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'reelsmith-admin', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok && !(method === 'GET' && r.status === 404)) throw new Error('GitHub: ' + (j.message || r.status));
  return r.status === 404 ? null : j;
}
// Two changes at the same moment can race on GitHub ("not a fast forward"): try again from the new head.
async function publishGitHub(tries = 3) {
  try { return await publishGitHubOnce(); }
  catch (e) { if (tries > 1 && /fast forward|Reference cannot be updated|409|422/i.test(e.message)) return publishGitHub(tries - 1); throw e; }
}
async function publishGitHubOnce() {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) throw new Error('Publishing online needs the GITHUB_TOKEN secret (GitHub token with Contents: Read and write on ' + (process.env.GITHUB_REPO || 'the repo') + ')');
  const { d, posts, images } = await collect();
  const branch = process.env.GITHUB_BRANCH || 'main';
  const ref = await gh('GET', `/git/ref/heads/${branch}`);
  const head = await gh('GET', `/git/commits/${ref.object.sha}`);
  const tree = [];
  const body = json(posts);
  const current = await gh('GET', `/contents/content/posts.json?ref=${branch}`);
  const same = current && Buffer.from(current.content || '', 'base64').toString('utf8') === body;
  if (!same) tree.push({ path: 'content/posts.json', mode: '100644', type: 'blob', sha: (await gh('POST', '/git/blobs', { content: body, encoding: 'utf-8' })).sha });
  let added = 0;
  for (const name of images) {
    if (await gh('GET', `/contents/src/assets/blog/${encodeURIComponent(name)}?ref=${branch}`)) continue;
    const buf = await readImage(d, name); if (!buf) continue;
    tree.push({ path: `src/assets/blog/${name}`, mode: '100644', type: 'blob', sha: (await gh('POST', '/git/blobs', { content: buf.toString('base64'), encoding: 'base64' })).sha });
    added++;
  }
  if (!tree.length) return { d, result: { mode: 'github', posts: posts.length, images: 0, ok: true, log: 'Nothing changed since the last publish — the site is up to date.' } };
  const t = await gh('POST', '/git/trees', { base_tree: head.tree.sha, tree });
  const c = await gh('POST', '/git/commits', { message: `Publish site: ${posts.length} live posts${added ? `, ${added} new image${added > 1 ? 's' : ''}` : ''} (admin)`, tree: t.sha, parents: [ref.object.sha] });
  await gh('PATCH', `/git/refs/heads/${branch}`, { sha: c.sha });
  return { d, result: { mode: 'github', posts: posts.length, images: added, ok: true, commit: c.sha.slice(0, 7), log: `Saved to GitHub (commit ${c.sha.slice(0, 7)}). Cloudflare is rebuilding reelsmithapp.com — live in about a minute.` } };
}

export async function publishSite() {
  const { d, result } = localSite() ? await publishLocal() : await publishGitHub();
  await d.collection('settings').updateOne({ _id: 'site' }, { $set: { lastPublish: { at: new Date(), posts: result.posts, ok: result.ok, mode: result.mode, log: String(result.log || '').slice(-2000) } } }, { upsert: true });
  return result;
}
