// One SEO report for the editor and the posts list: Yoast-style SEO + readability checks
// (lib/seo-analysis.js) and a 0–100 score from them.
import { analyzeSeo, analyzeReadability } from './seo-analysis.js';
import { textOf, words } from './seo.js';

export function seoReport(p, others = []) {
  const featured = p.featuredImage ? (typeof p.featuredImage === 'string' ? p.featuredImage : p.featuredImage.src) : null;
  const input = {
    keyphrase: p.focusKeyword || '', synonyms: p.synonyms || '', title: p.title || '',
    seoTitle: (p.metaTitle || p.title || '') + ' | Reelsmith', // the website adds the brand to every title
    slug: p.slug || '', metaDescription: p.metaDescription || p.excerpt || '', contentHtml: p.contentHtml || '',
    featuredImage: featured || null, featuredImageAlt: (p.featuredImage && p.featuredImage.alt) || '',
    otherKeyphrases: others, titleWidthPx: p.titleWidthPx,
  };
  const seo = analyzeSeo(input), read = analyzeReadability(input.contentHtml);
  const all = [...seo, ...read];
  const avg = all.length ? all.reduce((s, c) => s + (c.status === 'good' ? 9 : c.status === 'ok' ? 6 : 3), 0) / all.length : 3;
  const score = Math.max(0, Math.min(100, Math.round(((avg - 3) / 6) * 100)));
  return { seo, read, score, grade: score >= 80 ? 'good' : score >= 55 ? 'ok' : 'bad', words: words(textOf(input.contentHtml)).length };
}
