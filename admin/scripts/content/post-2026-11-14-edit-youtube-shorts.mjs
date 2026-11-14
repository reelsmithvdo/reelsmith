// Blog post, 2026-11-14: "How to Edit YouTube Shorts" — saved through savePost (cleans HTML, scores SEO).
// node --env-file=.env.local scripts/content/post-2026-11-14-edit-youtube-shorts.mjs   (MONGODB_DB decides where)
import { db } from '../../lib/db.js';
import { savePost } from '../../lib/posts.js';
import { seoReport } from '../../lib/score.js';

const fig = (src, alt, cap) => `<figure><img src="${src}" alt="${alt}"><figcaption>${cap}</figcaption></figure>`;
const tip = (html) => `<blockquote><p><strong>Tip:</strong> ${html}</p></blockquote>`;

const html = `<p>Want to edit YouTube Shorts that people actually watch to the end? This guide takes one Short from raw phone clips to a finished upload in about fifteen minutes, using Reelsmith — a free editor that runs in your browser, with no upload and no watermark. Every step uses a real button in the editor, so you can follow along.</p>
<p>The workflow works the same for Instagram Reels and TikTok, because all three use the same vertical 9:16 format.</p>
${fig('/assets/shots/templates.jpg', 'Edit YouTube Shorts with the Shorts template: a 9:16 frame with a hook title, progress bar and follow button', 'The Shorts template: a hook title, a progress bar and a follow button, with your clip on V1.')}
<h2>Before you edit YouTube Shorts: plan in one sentence</h2>
<p>Good Shorts are about one thing. Before you open the editor, finish this sentence: <em>"By the end, the viewer will…"</em> — know a trick, see a result, laugh at a reaction. Everything that doesn't serve that sentence gets cut. As a result, the edit becomes much faster, because you already know what to keep.</p>
<h2>Step 1: Start from the Shorts template</h2>
<ol><li>Open <a href="/">the editor</a>. On the start screen, under <strong>Start from a template</strong>, click <strong>Shorts / Reels / TikTok</strong>.</li><li>You get a 1080×1920 sequence with a hook title, a <strong>Progress Bar</strong> and a <strong>Follow Button</strong> already placed. V1 is left empty for your video.</li><li>Click <strong>Import video</strong> in the guide (or drag files onto the window) and drag your clips onto <strong>V1</strong>.</li></ol>
<p>The template keeps the vertical frame even if you drop in landscape footage. Prefer to start from scratch? <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">How to make vertical videos</a> explains the frame settings.</p>
<h2>Step 2: Cut it tight</h2>
<p>Shorts are judged in the first seconds, so the edit should never pause.</p>
<ul><li>Press <code>C</code> for the razor tool and click at the start and end of every pause or stumble.</li><li>Press <code>V</code>, select the piece you don't want and press <strong>⇧Delete</strong> (Ripple Delete) — the gap closes on its own.</li><li>Move your best moment to the very start. For example, show the finished result first and explain how afterwards.</li></ul>
${tip('Zoom the timeline with <code>=</code> and <code>−</code> to cut word by word. The audio waveform shows exactly where each pause is.')}
<h2>Step 3: Write the hook title</h2>
<p>The template's title says <em>WAIT FOR IT</em>. Double-click it in the Program monitor and type your own hook — three to six words that promise the payoff, such as <em>"I fixed it in 10 seconds"</em>. Then click <strong>Safe</strong> under the monitor: keep the text inside the inner box, because YouTube's buttons and caption cover the edges and the bottom of a Short.</p>
<p>Want a different look? Select the title and double-click a style in <strong>Effects ▸ Text Styles</strong>, or read <a href="/tutorials/animated-text-titles/">how to make animated text and 3D titles</a>.</p>
<h2>Step 4: Add captions so it works without sound</h2>
<p>Many people scroll with the sound off. Captions keep them watching, and they make your Short accessible.</p>
<ol><li>Open the <strong>Captions</strong> tab and click <strong>Auto-generate</strong>. Speech recognition runs on your own device, so your audio is never uploaded.</li><li>Click any caption to fix names and brand words.</li><li>The template already sets large captions with a dark box, placed above YouTube's buttons. Change them with <strong>Style…</strong> if you like.</li></ol>
${fig('/assets/shots/captions.jpg', 'Auto-generated captions in the Captions panel of the YouTube Shorts editor', 'Generated captions sit on their own CC track, so you can retime them by dragging.')}
<p>More detail: <a href="/tutorials/add-subtitles-to-video-automatically/">how to add subtitles to a video automatically</a>.</p>
<h2>Step 5: Add energy with effects and sound</h2>
<p>A Short should change something on screen every few seconds. You don't need much:</p>
<ul><li><strong>Zoom Punch (beat)</strong> from <strong>Effects ▸ Creative Effects</strong> adds a quick push-in on a beat — great on a punchline.</li><li>A <strong>Whip Pan</strong> or <strong>Zoom In</strong> transition between two clips hides a cut and keeps the pace up.</li><li><strong>Effects ▸ Sound Effects</strong> has original sounds like Whoosh, Pop and Ding. Double-click one to add it at the playhead.</li><li>Landscape clip that leaves empty space? Drag <strong>Background Blur Fill</strong> onto it instead of cropping.</li></ul>
${fig('/assets/shots/effects.jpg', 'Zoom Punch effect applied to a clip while editing a Short', 'Search the Effects panel — here for “zoom” — to find effects quickly.')}
<h2>Step 6: Make the sound clean and even</h2>
<p>Viewers forgive a shaky shot, but not bad audio. In addition, YouTube turns loud videos down, so there is no benefit in being louder than everyone else.</p>
<ul><li>Select your clips and choose <strong>Clip ▸ Normalize Loudness…</strong> at <strong>−14 LUFS</strong> (YouTube, Spotify and most online video).</li><li>Put music on its own audio track, select it and apply <strong>Effects ▸ Smart Audio ▸ Auto Duck Music Under Voice</strong> — the music dips whenever you speak.</li></ul>
<p>Quiet phone audio? See <a href="/tutorials/make-quiet-audio-louder/">how to make audio louder and clearer</a>.</p>
<h2>Step 7: Export your YouTube Short</h2>
<ol><li>Click <strong>Export</strong> and choose the <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> preset — 1080×1920 H.264 MP4.</li><li>If you burned captions in during step 4 they are included; you can also save an .srt file.</li><li>Upload the MP4 from the YouTube app or YouTube Studio. YouTube lists its current length and format rules in <a href="https://support.google.com/youtube/answer/12779649" target="_blank" rel="noopener">Upload YouTube Shorts</a>.</li></ol>
${tip('Export takes seconds on most computers because Reelsmith encodes on your own graphics hardware — nothing is uploaded until you upload it yourself.')}
<h2>A checklist to edit YouTube Shorts that keep viewers</h2>
<ul><li>The first second shows the result or asks a question.</li><li>No pauses left; the picture changes every few seconds.</li><li>It makes sense with the sound off.</li><li>Text and captions sit inside the safe zone.</li><li>Voice is clear and the music sits underneath it.</li><li>It ends cleanly — a loop back to the start often gets replays.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I edit YouTube Shorts on my phone?</h3>
<p>Yes. Reelsmith works in mobile browsers with touch gestures, so you can edit and export on the same phone you filmed with. Generating captions is slower on a phone, so start with the <strong>Tiny</strong> or <strong>Base</strong> caption model.</p>
<h3>Do I need a paid YouTube Shorts editor?</h3>
<p>No. Everything in this guide — the template, captions, effects, loudness and the 9:16 export — is free in Reelsmith, with no watermark and no account.</p>
<h3>Can I reuse a horizontal YouTube video as a Short?</h3>
<p>Yes. Cut the best 15–45 seconds, then either scale the clip up to fill the 9:16 frame or apply <strong>Background Blur Fill</strong> to keep the whole picture.</p>
<h3>Is my video uploaded while I edit?</h3>
<p>No. Editing, captions and export run on your device. Read <a href="/blog/private-video-editing-in-the-browser/">why your videos never leave your computer</a>.</p>
<p>For more ideas, see <a href="/blog/editing-tips-for-short-videos/">7 editing tips that make short videos easier to watch</a>. Ready? <a href="/">Open the editor</a> and start from the Shorts template.</p>`;

const post = {
  title: 'How to Edit YouTube Shorts: A Free Step-by-Step Workflow',
  slug: 'how-to-edit-youtube-shorts',
  section: 'blog', status: 'published', publishAt: new Date(),
  excerpt: 'Edit a YouTube Short from raw clips to upload in about fifteen minutes: template, tight cuts, hook title, captions, effects, clean sound and a 9:16 export — free, in your browser.',
  metaTitle: 'How to Edit YouTube Shorts (Free, Step by Step)',
  metaDescription: 'How to edit YouTube Shorts for free: a 9:16 template, tight cuts, a hook title, auto captions, effects, even sound and the right export — in your browser.',
  focusKeyword: 'edit YouTube Shorts', synonyms: 'YouTube Shorts editor, editing shorts, shorts editing, make a YouTube Short',
  keywords: 'edit youtube shorts, youtube shorts editor, how to make a youtube short, shorts template, vertical video, free',
  category: 'tips',
  featuredImage: { src: '/assets/shots/templates.jpg', alt: 'Edit YouTube Shorts with a 9:16 template: hook title, progress bar and follow button' },
  contentHtml: html, order: 99,
};

const d = await db();
const prev = await d.collection('posts').findOne({ section: 'blog', slug: post.slug });
const { id } = await savePost(prev ? String(prev._id) : null, post, { email: 'content-script' });
const now = await d.collection('posts').findOne({ _id: id });
const others = (await d.collection('posts').find({ _id: { $ne: id }, focusKeyword: { $ne: '' } }).toArray()).map((x) => ({ title: x.title, focusKeyphrase: x.focusKeyword }));
const r = seoReport(now, others);
await d.collection('posts').updateOne({ _id: id }, { $set: { seoScore: r.score } });
console.log(`${process.env.MONGODB_DB}: ${prev ? 'updated' : 'created'} ${post.slug} — score ${r.score}, ${r.words} words`);
console.log('not good:', [...r.seo, ...r.read].filter((x) => x.status !== 'good').map((x) => x.label + ': ' + x.text).join('\n  ') || '—');
process.exit(0);
