// SEO analysis for a post, run live in the editor (no network). Returns a 0–100 score and a checklist.
// The checks follow common on-page SEO practice (title/description length, focus keyword placement,
// content depth, headings, links, image alt text, readability).

const STOP = new Set('a an and are as at be by for from how in is it of on or the to what with your you why when this that'.split(' '));

export function textOf(html) {
  return String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}
export const words = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) || []);
export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
const has = (hay, kw) => !!kw && String(hay || '').toLowerCase().includes(kw);

export function analyze(p, site = 'reelsmithapp.com') {
  const kw = String(p.focusKeyword || '').trim().toLowerCase();
  const title = (p.metaTitle || p.title || '').trim();
  const desc = (p.metaDescription || p.excerpt || '').trim();
  const html = p.contentHtml || '';
  const text = textOf(html);
  const w = words(text);
  const first = textOf((html.match(/<p[^>]*>[\s\S]*?<\/p>/i) || [''])[0]);
  const heads = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => textOf(m[1]));
  const links = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith('/') || h.includes(site)).length;
  const external = links.length - internal;
  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/alt="[^"]+"/i.test(t)).length;
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 2);
  const avgSentence = sentences.length ? w.length / sentences.length : 0;
  const kwCount = kw ? (text.toLowerCase().split(kw).length - 1) : 0;
  const density = kw && w.length ? (kwCount * words(kw).length) / w.length * 100 : 0;
  const slugWords = String(p.slug || '').split('-').filter(Boolean);

  const checks = [];
  const add = (id, weight, status, label, tip) => checks.push({ id, weight, status, label, tip });

  // Focus keyword
  if (!kw) add('kw', 10, 'bad', 'Set a focus keyword', 'The search phrase you want this post to rank for, e.g. "add subtitles to video".');
  else {
    add('kw-title', 10, has(title, kw) ? 'good' : 'bad', has(title, kw) ? 'Focus keyword is in the SEO title' : 'Add the focus keyword to the SEO title', 'Put it near the start of the title if you can.');
    add('kw-desc', 6, has(desc, kw) ? 'good' : 'ok', has(desc, kw) ? 'Focus keyword is in the meta description' : 'Use the focus keyword in the meta description', 'Google bolds matching words in results, which attracts clicks.');
    const inSlug = words(kw).filter((x) => !STOP.has(x)).every((x) => slugWords.includes(x));
    add('kw-slug', 5, inSlug ? 'good' : 'ok', inSlug ? 'Focus keyword is in the URL' : 'Use the focus keyword in the URL slug', 'Short, readable URLs with the keyword rank better.');
    add('kw-first', 6, has(first, kw) ? 'good' : 'ok', has(first, kw) ? 'Focus keyword appears in the first paragraph' : 'Mention the focus keyword in the first paragraph', 'Tell readers and Google straight away what the post is about.');
    add('kw-heads', 5, heads.some((h) => has(h, kw)) ? 'good' : 'ok', heads.some((h) => has(h, kw)) ? 'Focus keyword is in a subheading' : 'Use the focus keyword in at least one subheading (H2/H3)', '');
    const dOk = density >= 0.5 && density <= 2.5;
    add('kw-density', 5, dOk ? 'good' : density > 2.5 ? 'bad' : 'ok', `Keyword density ${density.toFixed(1)}% (${kwCount}×)` + (dOk ? '' : density > 2.5 ? ' — too often, reads as spam' : ' — a little low'), 'Aim for roughly 0.5–2.5%.');
  }
  // Title and description
  const tl = title.length;
  add('title-len', 8, tl >= 30 && tl <= 60 ? 'good' : tl ? 'ok' : 'bad', `SEO title: ${tl} characters` + (tl > 60 ? ' — may be cut off in Google' : tl < 30 ? ' — a bit short' : ''), 'Best between 30 and 60 characters.');
  const dl = desc.length;
  add('desc-len', 8, dl >= 120 && dl <= 160 ? 'good' : dl ? 'ok' : 'bad', dl ? `Meta description: ${dl} characters` + (dl > 160 ? ' — may be cut off' : dl < 120 ? ' — could be longer' : '') : 'Write a meta description (or excerpt)', 'Best between 120 and 160 characters; it is the snippet people read in Google.');
  // Content
  const n = w.length;
  add('length', 10, n >= 600 ? 'good' : n >= 300 ? 'ok' : 'bad', `${n} words` + (n < 300 ? ' — too short to rank' : n < 600 ? ' — 600+ words rank better' : ''), 'In-depth posts that fully answer the question rank best.');
  add('headings', 5, heads.length >= 2 ? 'good' : heads.length ? 'ok' : 'bad', heads.length ? `${heads.length} subheading${heads.length > 1 ? 's' : ''}` : 'Add subheadings (H2) to structure the post', 'Subheadings help readers skim and help Google understand sections.');
  add('internal', 6, internal >= 2 ? 'good' : internal ? 'ok' : 'bad', `${internal} internal link${internal === 1 ? '' : 's'}` + (internal < 2 ? ' — link to 2+ other Reelsmith pages' : ''), 'Link to related tutorials, docs or the editor.');
  add('external', 3, external >= 1 ? 'good' : 'ok', external ? `${external} outbound link${external > 1 ? 's' : ''}` : 'Add a link to a useful outside source', 'Citing good sources builds trust.');
  add('images', 5, imgs.length && !noAlt ? 'good' : imgs.length ? 'bad' : 'ok', imgs.length ? (noAlt ? `${noAlt} image${noAlt > 1 ? 's' : ''} without alt text` : `${imgs.length} image${imgs.length > 1 ? 's' : ''}, all with alt text`) : 'Add at least one image (screenshot)', 'Alt text describes the image for Google Images and screen readers.');
  add('featured', 4, p.featuredImage ? 'good' : 'ok', p.featuredImage ? 'Featured image set' : 'Set a featured image', 'Used for social shares and the blog list.');
  add('readability', 4, !n ? 'ok' : avgSentence <= 20 ? 'good' : 'ok', n ? `Average sentence: ${avgSentence.toFixed(0)} words` + (avgSentence > 20 ? ' — try shorter sentences' : '') : 'Readability', 'Short sentences are easier to read on phones.');
  const sl = String(p.slug || '');
  add('slug', 3, sl && sl.length <= 60 && slugWords.length <= 8 ? 'good' : sl ? 'ok' : 'bad', sl ? `URL slug: /${sl}/` + (sl.length > 60 ? ' — shorten it' : '') : 'Set a URL slug', '');

  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + c.weight * (c.status === 'good' ? 1 : c.status === 'ok' ? 0.5 : 0), 0);
  const score = Math.round((got / total) * 100);
  return { score, grade: score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad', words: n, checks: checks.sort((a, b) => ({ bad: 0, ok: 1, good: 2 }[a.status] - { bad: 0, ok: 1, good: 2 }[b.status])) };
}
