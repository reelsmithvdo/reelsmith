// Builds the public website pages (static HTML) into src/ so Cloudflare serves them next to the editor:
//   /features/  /docs/…  /tutorials/…  /blog/…  /about/  /privacy/  /terms/  404.html  sitemap.xml  robots.txt
// Sources: src/js/help-content.js (docs), content/tutorials/*.md, content/blog/*.md, content/pages/*.md.
// Run:  npm run site      (commit the output; the website has no build step on Cloudflare)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const CONTENT = path.join(ROOT, 'content');
const ORIGIN = 'https://reelsmithapp.com';
const TODAY = new Date().toISOString().slice(0, 10);
const GENERATED = ['features', 'tools', 'docs', 'tutorials', 'blog', 'about', 'privacy', 'terms', 'contact'];

// ---------------------------------------------------------------- help content
const ctx = { globalThis: {} }; ctx.window = ctx.globalThis; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SRC, 'js', 'help-content.js'), 'utf8'), ctx);
const { HELP_CATEGORIES, HELP_ARTICLES, helpVariant } = ctx.window.RS;
const docs = HELP_ARTICLES.filter((a) => a.only !== 'desktop').map((a) => Object.assign({}, a, { body: helpVariant(a.body, 'web') }));
const docById = Object.fromEntries(docs.map((a) => [a.id, a]));

// ---------------------------------------------------------------- markdown
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brokenLinks = [];
function inline(s, where) {
  const codes = [];
  let t = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = t
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, cap) => `<figure><img src="${src}" alt="${alt}" loading="lazy" decoding="async">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`)
    .replace(/\[\[([\w-]+)\|([^\]]+)\]\]/g, (_, id, text) => {
      if (!docById[id]) { brokenLinks.push(`${where} → docs/${id}`); return text; }
      return `<a href="/docs/${id}/">${text}</a>`;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => `<a href="${href}"${/^https?:/.test(href) ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}
function markdown(src, where = '') {
  const out = [];
  let para = [];
  let list = null; // {tag, items:[{text, sub:[]}]}
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), where)}</p>`); para = []; } };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list.tag}>` + list.items.map((i) => `<li>${inline(i.text, where)}${i.sub.length ? '<ul>' + i.sub.map((x) => `<li>${inline(x, where)}</li>`).join('') + '</ul>' : ''}</li>`).join('') + `</${list.tag}>`);
    list = null;
  };
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{2,3}) (.*)$/))) { flushPara(); flushList(); out.push(m[1].length === 2 ? `<h2 id="${slug(m[2])}">${inline(m[2], where)}</h2>` : `<h3>${inline(m[2], where)}</h3>`); continue; }
    if (/^\s{2,}[-*] /.test(raw) && list && list.items.length) { list.items[list.items.length - 1].sub.push(line.replace(/^[-*] /, '')); continue; }
    if ((m = line.match(/^- (.*)$/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push({ text: m[1], sub: [] }); continue; }
    if ((m = line.match(/^\d+\. (.*)$/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push({ text: m[1], sub: [] }); continue; }
    if ((m = line.match(/^> (.*)$/))) { flushPara(); flushList(); out.push(`<aside class="tip">${inline(m[1], where)}</aside>`); continue; }
    if (/^!\[/.test(line)) { flushPara(); flushList(); out.push(inline(line, where)); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
const plain = (s) => s.replace(/\{\{[^}]*\}\}/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[\[[\w-]+\|([^\]]+)\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*|`|^#+ |^> /gm, '').replace(/\s+/g, ' ').trim();
const describe = (body, max = 155) => { const p = plain(body); return p.length <= max ? p : p.slice(0, p.lastIndexOf(' ', max - 1)) + '…'; };

function readMd(dir) {
  const d = path.join(CONTENT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => {
    const raw = fs.readFileSync(path.join(d, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error(`${dir}/${f}: missing front matter`);
    const meta = Object.fromEntries(m[1].split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    for (const k of ['title', 'description']) if (!meta[k]) throw new Error(`${dir}/${f}: missing ${k}`);
    return Object.assign({ slug: f.replace(/\.md$/, ''), body: m[2] }, meta);
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (+a.order || 0) - (+b.order || 0));
}
// Blog posts and tutorials come from the admin dashboard (MongoDB → content/posts.json, written by
// "Publish site"). Without that file, the Markdown files in content/blog and content/tutorials are used.
const POSTS_JSON = path.join(CONTENT, 'posts.json');
const fromDb = fs.existsSync(POSTS_JSON) ? JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')).posts : null;
// One-time import helper for the admin: write the Markdown posts converted to HTML to $RS_DUMP_CONTENT, then stop.
if (process.env.RS_DUMP_CONTENT) {
  const conv = (section) => (a) => ({ section, slug: a.slug, title: a.title, description: a.description, date: a.date, order: a.order, image: a.image || '', html: markdown(a.body, section) });
  fs.writeFileSync(process.env.RS_DUMP_CONTENT, JSON.stringify([...readMd('tutorials').map(conv('tutorial')), ...readMd('blog').map(conv('blog'))]));
  process.exit(0);
}
const tutorials = (fromDb ? fromDb.filter((p) => p.section === 'tutorial') : readMd('tutorials')).sort((a, b) => (+a.order || 99) - (+b.order || 99));
const posts = (fromDb ? fromDb.filter((p) => p.section === 'blog') : readMd('blog')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const pages = Object.fromEntries(readMd('pages').map((p) => [p.slug, p]));

// ---------------------------------------------------------------- layout
const NAV = [['Features', '/features/'], ['Tools', '/tools/'], ['Tutorials', '/tutorials/'], ['Docs', '/docs/'], ['Blog', '/blog/']];
function layout({ title, description, urlPath, body, section, jsonld = [], ogType = 'website', image }) {
  const url = ORIGIN + urlPath;
  const fullTitle = urlPath === '/features/' ? title : `${title} | Reelsmith`;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  const img = ORIGIN + (image || '/assets/og.jpg');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; object-src 'none'; base-uri 'self'">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Reelsmith">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/site.css">
<script src="/consent.js" defer></script>
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="logo" href="/features/"><img src="/assets/icon-64.png" alt="" width="28" height="28">Reelsmith</a>
    <nav aria-label="Main">${NAV.map(([t, h]) => `<a href="${h}"${section === h ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <a class="btn" href="/">Open Editor</a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap cols">
    <div><a class="logo" href="/features/"><img src="/assets/icon-64.png" alt="" width="24" height="24">Reelsmith</a><p>Free video editor in your browser. Your files stay on your computer.</p></div>
    <div><h4>Product</h4><a href="/">Open Editor</a><a href="/features/">Features</a><a href="/docs/browser-edition/">Browser support</a></div>
    <div><h4>Learn</h4><a href="/tools/">Free tools</a><a href="/tutorials/">Tutorials</a><a href="/docs/">Documentation</a><a href="/docs/shortcuts/">Keyboard shortcuts</a><a href="/blog/">Blog</a></div>
    <div><h4>Follow</h4><a href="https://www.youtube.com/@ReelSmithVdo" target="_blank" rel="noopener">YouTube</a><a href="https://www.facebook.com/reelsmithvdo/" target="_blank" rel="noopener">Facebook</a><a href="https://www.reddit.com/user/reelsmithvdo/" target="_blank" rel="noopener">Reddit</a></div>
    <div><h4>Support</h4><a href="/contact/">Contact us</a><a href="/?report=bug">Report a bug</a><a href="/?report=feature">Request a feature</a><a href="/docs/faq/">FAQ</a></div>
    <div><h4>Reelsmith</h4><a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="#" data-consent-settings>Cookie settings</a><a href="/contact/">Contact</a></div>
  </div>
  <div class="wrap fine"><span>© ${new Date().getFullYear()} Reelsmith</span><span class="credit">Made with <svg class="heart" viewBox="0 0 24 24" width="14" height="14" aria-label="love" role="img"><path fill="#e5484d" d="M12 21s-7.5-4.6-10-9.3C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.6 1.2 4.4 2.4h2.8c.8-1.2 2.2-2.4 4.4-2.4 3.9 0 5.8 4.1 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg> by <a href="https://algomatryx.com/" target="_blank" rel="noopener">Algo Matryx</a></span></div>
</footer>
</body>
</html>
`;
}
const crumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })),
});
const crumbHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, p], i) => (i < items.length - 1 ? `<a href="${p}">${esc(n)}</a><span>›</span>` : `<span aria-current="page">${esc(n)}</span>`)).join('')}</nav>`;
const cta = `<div class="cta"><div><strong>Try it now — free, no sign-up.</strong><span>Reelsmith runs in your browser. Your videos are never uploaded.</span></div><a class="btn" href="/">Open the editor</a></div>`;
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ---------------------------------------------------------------- write helpers
const written = [];
function write(urlPath, html, { priority = 0.6, lastmod = TODAY, sitemap = true } = {}) {
  const file = urlPath.endsWith('/') ? path.join(SRC, urlPath, 'index.html') : path.join(SRC, urlPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (sitemap) written.push({ loc: ORIGIN + urlPath, lastmod, priority });
}
for (const d of GENERATED) fs.rmSync(path.join(SRC, d), { recursive: true, force: true });

// ---------------------------------------------------------------- docs
const cats = HELP_CATEGORIES.filter((c) => docs.some((a) => a.cat === c));
const docsNav = (cur) => `<nav class="docs-nav" aria-label="Documentation">${cats.map((c) => `<h4>${esc(c)}</h4>` + docs.filter((a) => a.cat === c).map((a) => `<a href="/docs/${a.id}/"${a.id === cur ? ' aria-current="page"' : ''}>${esc(a.title)}</a>`).join('')).join('')}</nav>`;
const ordered = cats.flatMap((c) => docs.filter((a) => a.cat === c));
ordered.forEach((a, i) => {
  const prev = ordered[i - 1], next = ordered[i + 1];
  const p = `/docs/${a.id}/`;
  const bc = [['Docs', '/docs/'], [a.cat, '/docs/#' + slug(a.cat)], [a.title, p]];
  const body = `<div class="wrap docs">
${docsNav(a.id)}
<article class="prose">
${crumbHtml(bc)}
<h1>${esc(a.title)}</h1>
${markdown(a.body, 'docs/' + a.id)}
<p class="keys-note">Shortcuts show the Mac keys: on Windows and Linux use <code>Ctrl</code> for <code>⌘</code> and <code>Alt</code> for <code>⌥</code>.</p>
<nav class="pager">${prev ? `<a href="/docs/${prev.id}/">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="/docs/${next.id}/">${esc(next.title)} →</a>` : ''}</nav>
${cta}
</article>
</div>`;
  write(p, layout({ title: a.title, description: describe(a.body), urlPath: p, body, section: '/docs/', jsonld: [crumbs(bc), { '@context': 'https://schema.org', '@type': 'TechArticle', headline: a.title, description: describe(a.body), url: ORIGIN + p, dateModified: TODAY, publisher: { '@type': 'Organization', name: 'Reelsmith', logo: { '@type': 'ImageObject', url: ORIGIN + '/assets/icon-256.png' } } }] }), { priority: 0.5 });
});
write('/docs/', layout({
  title: 'Reelsmith Documentation', description: 'Everything about editing in Reelsmith: importing, the timeline, titles, effects, color, audio, captions and exporting.',
  urlPath: '/docs/', section: '/docs/',
  body: `<div class="wrap narrow"><h1>Documentation</h1><p class="lead">How every part of Reelsmith works. New here? Start with <a href="/docs/first-edit/">Your first edit in 5 minutes</a>.</p>
${cats.map((c) => `<section class="doc-cat" id="${slug(c)}"><h2>${esc(c)}</h2><ul class="doc-list">${docs.filter((a) => a.cat === c).map((a) => `<li><a href="/docs/${a.id}/">${esc(a.title)}</a><span>${esc(describe(a.body, 110))}</span></li>`).join('')}</ul></section>`).join('\n')}
${cta}</div>`,
}), { priority: 0.7 });


// ---------------------------------------------------------------- article helpers (SEO)
// Image size from the file header (JPEG, PNG, WebP), so <img> gets width/height and the page does not jump.
const sizeCache = {};
function imgSize(src) {
  if (!src || !src.startsWith('/')) return null;
  if (src in sizeCache) return sizeCache[src];
  let r = null;
  try {
    const b = fs.readFileSync(path.join(SRC, src.split('?')[0]));
    if (b[0] === 0x89 && b[1] === 0x50) r = [b.readUInt32BE(16), b.readUInt32BE(20)];
    else if (b[0] === 0xff && b[1] === 0xd8) {
      for (let i = 2; i < b.length - 9;) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { r = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; }
        i += 2 + len;
      }
    } else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const k = b.toString('ascii', 12, 16);
      if (k === 'VP8X') r = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
      else if (k === 'VP8 ') r = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      else if (k === 'VP8L') { const n = b.readUInt32LE(21); r = [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    }
  } catch {}
  return (sizeCache[src] = r);
}
const sizeAttr = (src) => { const d = imgSize(src); return d ? ` width="${d[0]}" height="${d[1]}"` : ''; };
// Admin HTML: give every H2 an id (jump links), images their size, and lazy loading below the first one.
function enhanceHtml(html) {
  const used = new Set();
  let n = 0;
  return html
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (m, t) => { let id = slug(t) || 'section'; while (used.has(id)) id += '-2'; used.add(id); return `<h2 id="${id}">${t}</h2>`; })
    .replace(/<h2 id="([^"]+)"/g, (m, id) => { used.add(id); return m; })
    .replace(/<img\b([^>]*)>/g, (m, at) => {
      n++;
      const src = (at.match(/\bsrc="([^"]+)"/) || [])[1];
      let out = at;
      if (!/\bwidth=/.test(out)) out += sizeAttr(src);
      if (!/\bloading=/.test(out)) out += ' loading="lazy"';
      if (!/\bdecoding=/.test(out)) out += ' decoding="async"';
      return `<img${out}>`;
    });
}
const tocHtml = (html) => {
  const hs = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  if (hs.length < 4) return '';
  return `<nav class="toc" aria-label="On this page"><strong>On this page</strong><ol>${hs.map((h) => `<li><a href="#${h[1]}">${h[2].replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></nav>`;
};
// ---------------------------------------------------------------- tutorials and blog
// Up to three other guides: same category first, then the same section, then the rest.
function relatedHtml(kind, a) {
  const all = [...tutorials.map((x) => ['/tutorials/', x]), ...posts.map((x) => ['/blog/', x])].filter(([, x]) => x.slug !== a.slug);
  const score = ([b, x]) => (a.category && x.category === a.category ? 2 : 0) + ((b === '/tutorials/') === (kind === 'tutorial') ? 1 : 0);
  const pick = all.sort((p, q) => score(q) - score(p)).slice(0, 3);
  if (!pick.length) return '';
  return `<section class="related"><h2>Related guides</h2><ul>${pick.map(([b, x]) => `<li><a href="${b}${x.slug}/">${esc(x.title)}</a></li>`).join('')}</ul></section>`;
}
function articlePage(kind, a) {
  const base = kind === 'tutorial' ? '/tutorials/' : '/blog/';
  const p = base + a.slug + '/';
  const bc = [[kind === 'tutorial' ? 'Tutorials' : 'Blog', base], [a.title, p]];
  const bodyHtml = a.html != null ? enhanceHtml(a.html) : markdown(a.body, base + a.slug); // admin posts are stored as clean HTML
  const words = bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const meta = [a.date ? `<time datetime="${a.date}">${fmtDate(a.date)}</time>` : '', a.categoryName ? esc(a.categoryName) : '', `${Math.max(1, Math.round(words / 220))} min read`].filter(Boolean).join(' · ');
  const body = `<div class="wrap narrow"><article class="prose">
${crumbHtml(bc)}
<h1>${esc(a.title)}</h1>
<p class="meta">${meta}</p>
<p class="lead">${a.html != null ? esc(a.excerpt || a.description) : inline(a.description)}</p>
${a.html != null && a.image && !bodyHtml.includes(a.image) ? `<figure class="hero-img"><img src="${esc(a.image)}" alt="${esc(a.imageAlt || a.title)}"${sizeAttr(a.image)} fetchpriority="high"></figure>` : ''}
${tocHtml(bodyHtml)}
${bodyHtml}
${cta}
${relatedHtml(kind, a)}
</article></div>`;
  const ld = { '@context': 'https://schema.org', '@type': kind === 'tutorial' ? 'TechArticle' : 'BlogPosting', headline: a.title, description: a.description, url: ORIGIN + p, image: ORIGIN + (a.image || '/assets/og.jpg'), datePublished: a.date, dateModified: a.updated || a.date, author: { '@type': 'Organization', name: 'Reelsmith' }, publisher: { '@type': 'Organization', name: 'Reelsmith', logo: { '@type': 'ImageObject', url: ORIGIN + '/assets/icon-256.png' } } };
  if (a.keywords && a.keywords.length) ld.keywords = a.keywords.join(', ');
  write(p, layout({ title: a.metaTitle || a.title, description: a.description, urlPath: p, body, section: base, ogType: 'article', image: a.image, jsonld: [crumbs(bc), ld] }), { priority: 0.8, lastmod: a.updated || a.date || TODAY });
}
tutorials.forEach((a) => articlePage('tutorial', a));
posts.forEach((a) => articlePage('blog', a));
const itemList = (name, list, base) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: ORIGIN + base, mainEntity: { '@type': 'ItemList', itemListElement: list.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: ORIGIN + base + a.slug + '/', name: a.title })) } });
const cards = (list, base) => `<div class="cards">${list.map((a) => `<a class="card" href="${base}${a.slug}/">${a.image ? `<img src="${a.image}" alt=""${sizeAttr(a.image)} loading="lazy">` : ''}<h2>${esc(a.title)}</h2><p>${esc(a.description)}</p>${a.date && base === '/blog/' ? `<time datetime="${a.date}">${fmtDate(a.date)}</time>` : ''}</a>`).join('')}</div>`;
write('/tutorials/', layout({ title: 'Video Editing Tutorials', description: 'Step-by-step tutorials for Reelsmith, the free online video editor: captions, background removal, vertical videos, text animation, audio and more.', urlPath: '/tutorials/', section: '/tutorials/', jsonld: [itemList('Video Editing Tutorials', tutorials, '/tutorials/')], body: `<div class="wrap"><h1>Tutorials</h1><p class="lead">Step-by-step guides for the things people do most. Every tutorial works in the free browser editor.</p>${cards(tutorials, '/tutorials/')}${cta}</div>` }), { priority: 0.8 });
write('/blog/', layout({ title: 'Reelsmith Blog', description: 'News, tips and behind-the-scenes from Reelsmith, the free video editor that runs in your browser.', urlPath: '/blog/', section: '/blog/', jsonld: [itemList('Reelsmith Blog', posts, '/blog/')], body: `<div class="wrap"><h1>Blog</h1><p class="lead">News and editing tips.</p>${cards(posts, '/blog/')}</div>` }), { priority: 0.6 });

// ---------------------------------------------------------------- tools (content/tools/*.md): one page per task
// Each page opens the editor with a task guide: /?tool=<id> (see W.TOOLS in src/js/web.js).
const tools = readMd('tools').sort((a, b) => (+a.order || 99) - (+b.order || 99));
const toolIds = new Set((fs.readFileSync(path.join(SRC, 'js', 'web.js'), 'utf8').match(/W\.TOOLS = \{([\s\S]*?)\n  \};/) || ['', ''])[1].match(/^\s{4}([\w-]+): \{/gm)?.map((x) => x.trim().replace(/: \{$/, '')) || []);
for (const t of tools) {
  if (!toolIds.has(t.tool)) throw new Error(`content/tools/${t.slug}.md: tool "${t.tool}" is not in W.TOOLS (src/js/web.js)`);
  const p = `/tools/${t.slug}/`;
  const bc = [['Tools', '/tools/'], [t.title, p]];
  const open = `<p class="hero-cta"><a class="btn big" href="/?tool=${t.tool}">Open the tool — free</a></p>`;
  const others = tools.filter((x) => x !== t).slice(0, 6);
  const body = `<div class="wrap narrow"><article class="prose">
${crumbHtml(bc)}
<h1>${esc(t.title)}</h1>
<p class="lead">${inline(t.description)}</p>
${open}
${t.image ? `<figure class="hero-img"><img src="${esc(t.image)}" alt="${esc(t.imageAlt || t.title)}"${sizeAttr(t.image)} fetchpriority="high"></figure>` : ''}
${enhanceHtml(markdown(t.body, p))}
${cta}
<section class="related"><h2>More free tools</h2><ul>${others.map((x) => `<li><a href="/tools/${x.slug}/">${esc(x.title)}</a></li>`).join('')}</ul></section>
</article></div>`;
  const ld = { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${t.title} — Reelsmith`, url: ORIGIN + p, description: t.description, applicationCategory: 'MultimediaApplication', operatingSystem: 'Web browser', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, image: ORIGIN + (t.image || '/assets/og.jpg') };
  write(p, layout({ title: t.metaTitle || t.title, description: t.description, urlPath: p, body, section: '/tools/', image: t.image, jsonld: [crumbs(bc), ld] }), { priority: 0.8 });
}
write('/tools/', layout({ title: 'Free Online Video Tools', description: 'Free online video tools that run in your browser: add subtitles, trim, merge, crop, resize, rotate, compress, speed up, reverse and more. Nothing is uploaded.', urlPath: '/tools/', section: '/tools/', jsonld: [itemList('Free Online Video Tools', tools, '/tools/')],
  body: `<div class="wrap"><h1>Free online video tools</h1><p class="lead">Quick jobs, done in your browser. Each tool opens the full editor with a short guide — your files are never uploaded.</p><div class="cards">${tools.map((t) => `<a class="card" href="/tools/${t.slug}/"><h2>${esc(t.title)}</h2><p>${esc(t.description)}</p></a>`).join('')}</div>${cta}</div>` }), { priority: 0.9 });

// ---------------------------------------------------------------- simple pages + features
for (const id of ['about', 'privacy', 'terms']) {
  const pg = pages[id];
  if (!pg) throw new Error('content/pages/' + id + '.md missing');
  const p = `/${id}/`;
  write(p, layout({ title: pg.title, description: pg.description, urlPath: p, body: `<div class="wrap narrow"><article class="prose"><h1>${esc(pg.title)}</h1>${pg.updated ? `<p class="meta">Last updated ${fmtDate(pg.updated)}</p>` : ''}${markdown(pg.body, p)}</article></div>` }), { priority: 0.3, lastmod: pg.updated || TODAY });
}
// Contact page: a form posting to /api/contact (worker/index.js → Brevo), with src/contact.js.
{
  const p = '/contact/';
  const opt = [['general', 'General question'], ['business', 'Business or partnership'], ['press', 'Press'], ['privacy', 'Privacy request'], ['other', 'Other']];
  const body = `<div class="wrap narrow"><article class="prose">
<h1>Contact Reelsmith</h1>
<p class="lead">Questions, ideas or partnership requests — write to us and we reply by email, usually within two working days.</p>
<ul class="contact-alt"><li><strong>Found a bug?</strong> <a href="/?report=bug">Report it from the editor</a> — it adds the technical details we need.</li><li><strong>Want a feature?</strong> <a href="/?report=feature">Request a feature</a>.</li><li><strong>How do I…?</strong> Try the <a href="/docs/faq/">FAQ</a>, <a href="/tutorials/">tutorials</a> and <a href="/docs/">documentation</a>.</li></ul>
<form class="contact-form" id="contact-form" novalidate>
  <div class="cf-row"><label for="cf-name">Your name</label><input id="cf-name" name="name" autocomplete="name" maxlength="100" required></div>
  <div class="cf-row"><label for="cf-email">Your email</label><input id="cf-email" name="email" type="email" autocomplete="email" maxlength="200" required></div>
  <div class="cf-row"><label for="cf-topic">Topic</label><select id="cf-topic" name="topic">${opt.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
  <div class="cf-row"><label for="cf-message">Message</label><textarea id="cf-message" name="message" rows="7" maxlength="5000" required></textarea></div>
  <div class="cf-hp" aria-hidden="true"><label for="cf-website">Website</label><input id="cf-website" name="website" tabindex="-1" autocomplete="off"></div>
  <p class="small">We use your email only to answer you. Messages are delivered by our email provider, Brevo — see the <a href="/privacy/">Privacy Policy</a>.</p>
  <p class="cf-status" role="status" aria-live="polite"></p>
  <button class="btn big" type="submit">Send message</button>
</form>
<p class="small">Prefer email? Write to <a href="mailto:reelsmith.vdo@gmail.com">reelsmith.vdo@gmail.com</a>.</p>
</article></div>
<script src="/contact.js" defer></script>`;
  const ld = { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact Reelsmith', url: ORIGIN + p, mainEntity: { '@type': 'Organization', name: 'Reelsmith', url: ORIGIN + '/', email: 'reelsmith.vdo@gmail.com', contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'reelsmith.vdo@gmail.com', availableLanguage: ['English'] } } };
  write(p, layout({ title: 'Contact', description: 'Contact the Reelsmith team: questions, feedback, business and press. Write to us with the form or by email and we reply within two working days.', urlPath: p, body, jsonld: [ld] }), { priority: 0.4 });
}
const feat = pages.features;
if (!feat) throw new Error('content/pages/features.md missing');
write('/features/', layout({
  title: feat.title, description: feat.description, urlPath: '/features/', section: '/features/',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Reelsmith', applicationCategory: 'MultimediaApplication', operatingSystem: 'Web browser (Chrome, Edge, Safari, Firefox)', url: ORIGIN + '/', description: feat.description, image: ORIGIN + '/assets/og.jpg', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Reelsmith', url: ORIGIN + '/' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Reelsmith', url: ORIGIN + '/', logo: ORIGIN + '/assets/brand/logo-mark-1024.png', email: 'reelsmith.vdo@gmail.com',
      sameAs: ['https://www.youtube.com/@ReelSmithVdo', 'https://www.facebook.com/reelsmithvdo/', 'https://www.reddit.com/user/reelsmithvdo/'] }],
  body: `<section class="hero"><div class="wrap">
<h1>${esc(feat.headline || feat.title)}</h1>
<p class="lead">${inline(feat.subhead || feat.description)}</p>
<p class="hero-cta"><a class="btn big" href="/">Open the editor — it’s free</a><a class="btn ghost big" href="/tutorials/">See tutorials</a></p>
<p class="small">No download, no account, no watermark. Works in Chrome, Edge, Safari and Firefox.</p>
${feat.hero ? `<img class="hero-shot" src="${feat.hero}" alt="The Reelsmith editor with a timeline, program monitor and effect controls" width="1500" height="920">` : ''}
</div></section>
<div class="wrap features prose wide">${markdown(feat.body, '/features/')}</div>
<div class="wrap">${cta}</div>`,
}), { priority: 1.0 });

write('/404.html', layout({ title: 'Page not found', description: 'This page does not exist.', urlPath: '/404.html', body: `<div class="wrap narrow"><h1>Page not found</h1><p class="lead">That page doesn’t exist (any more). Try the <a href="/docs/">documentation</a>, the <a href="/tutorials/">tutorials</a>, or <a href="/">open the editor</a>.</p></div>` }).replace('<link rel="canonical" href="https://reelsmithapp.com/404.html">', '<meta name="robots" content="noindex">'), { sitemap: false });

// ---------------------------------------------------------------- sitemap + robots
const all = [{ loc: ORIGIN + '/', lastmod: TODAY, priority: 1.0 }, ...written];
fs.writeFileSync(path.join(SRC, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(SRC, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// ---------------------------------------------------------------- checks
const exists = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return true;
  const f = path.join(SRC, clean);
  return fs.existsSync(clean.endsWith('/') ? path.join(f, 'index.html') : f);
};
const bad = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!exists(m[1])) bad.push(path.relative(SRC, p) + ' → ' + m[1]); } };
for (const d of GENERATED) walk(path.join(SRC, d));
walk(SRC === '' ? '.' : path.join(SRC)); // also 404.html at the root (index.html links are app-relative)
const uniq = [...new Set(bad.filter((b) => !b.startsWith('index.html')))];
if (brokenLinks.length || uniq.length) { console.error('Broken links:\n  ' + [...brokenLinks, ...uniq].join('\n  ')); process.exit(1); }
// Fingerprint the editor's scripts and styles so visitors always get the newest version.
{ const st = require('./stamp-assets'); fs.writeFileSync(path.join(SRC, 'index.html'), st.stamped()); }
console.log(`Website built: ${docs.length} docs, ${tutorials.length} tutorials, ${posts.length} blog posts, ${all.length} URLs in sitemap.xml`);
