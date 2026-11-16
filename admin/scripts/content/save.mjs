// Shared by the post scripts in this folder: saves one post through the admin's own code (savePost cleans
// the HTML and scores it), optionally uploading an image to the Media library first.
//   node --env-file=.env.local scripts/content/<post>.mjs          → local copy of the database
//   node --env-file=.env.local scripts/content/<post>.mjs --live   → the live database (goes live on its publishAt)
import fs from 'fs';
import { useD1 } from '../d1.mjs';

export const fig = (src, alt, cap) => `<figure><img src="${src}" alt="${alt}"><figcaption>${cap}</figcaption></figure>`;
export const tip = (html) => `<blockquote><p><strong>Tip:</strong> ${html}</p></blockquote>`;

// post: the fields of the admin's post editor. image (optional): { file: URL|path, name, alt, width, height, type }
// → uploaded once to the Media library and served at /assets/blog/<name>.
export async function savePostScript(post, image) {
  const proxy = await useD1();
  const { all, run } = await import('../../lib/db.js');
  const { savePost, findPost, getPost, effectiveStatus } = await import('../../lib/posts.js');
  const { findMedia, saveMedia } = await import('../../lib/media.js');
  const { seoReport } = await import('../../lib/score.js');
  if (image && !(await findMedia(image.name))) {
    await saveMedia({ filename: image.name, contentType: image.type || 'image/jpeg', data: fs.readFileSync(image.file), alt: image.alt, width: image.width, height: image.height });
  }
  const prev = await findPost(post.section || 'blog', post.slug);
  const { id } = await savePost(prev ? prev._id : null, post, { email: 'content-script' });
  const now = await getPost(id);
  const others = (await all(`SELECT title, json_extract(doc, '$.focusKeyword') AS k FROM posts WHERE id <> ? AND ifnull(json_extract(doc, '$.focusKeyword'), '') <> ''`, id)).map((x) => ({ title: x.title, focusKeyphrase: x.k }));
  const r = seoReport(now, others);
  await run(`UPDATE posts SET doc = json_set(doc, '$.seoScore', ?) WHERE id = ?`, r.score, id);
  console.log(`${prev ? 'updated' : 'created'} ${post.slug} (${effectiveStatus(now)}, publishes ${new Date(now.publishAt).toISOString()}) — SEO score ${r.score}, ${r.words} words`);
  const todo = [...r.seo, ...r.read].filter((x) => x.status !== 'good');
  if (todo.length) console.log('  to improve:\n  ' + todo.map((x) => x.label + ': ' + x.text).join('\n  '));
  await proxy.dispose();
  return r;
}
