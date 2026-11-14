// Blog post scheduled for 2026-11-15 10:00 (Asia/Dhaka): "How to Turn a Long Video into Shorts".
// Uploads its screenshot to the Media library (GridFS, like the admin) and saves the post through savePost.
// node --env-file=.env.local scripts/content/post-2026-11-15-long-video-into-shorts.mjs  (MONGODB_DB decides where)
import fs from 'fs';
import { Readable } from 'stream';
import { db, bucket } from '../../lib/db.js';
import { savePost } from '../../lib/posts.js';
import { seoReport } from '../../lib/score.js';

const IMG = { file: new URL('../../../src/assets/shots/repurpose.jpg', import.meta.url), name: 'turn-long-video-into-shorts.jpg', w: 1500, h: 888,
  alt: 'Turn a long video into Shorts: markers on the best moments, a vertical Short sequence tab and an In/Out range in the Source monitor' };

const d = await db();
// Media library: reuse the image if it was uploaded before (same filename), otherwise upload it.
let media = await d.collection('media.files').findOne({ filename: IMG.name });
if (!media) {
  const b = await bucket();
  const up = b.openUploadStream(IMG.name, { metadata: { alt: IMG.alt, width: IMG.w, height: IMG.h, contentType: 'image/jpeg' } });
  await new Promise((res, rej) => Readable.from(fs.readFileSync(IMG.file)).pipe(up).on('finish', res).on('error', rej));
  media = await d.collection('media.files').findOne({ filename: IMG.name });
}
const src = '/assets/blog/' + IMG.name;
const fig = (s, alt, cap) => `<figure><img src="${s}" alt="${alt}"><figcaption>${cap}</figcaption></figure>`;
const tip = (html) => `<blockquote><p><strong>Tip:</strong> ${html}</p></blockquote>`;

const html = `<p>One good long video can become five or ten Shorts. This guide shows how to turn a long video into Shorts — a podcast, a tutorial, a stream or a vlog — by marking the best moments, cutting each one into its own vertical sequence and exporting them in one sitting. It all happens in Reelsmith, a free editor in your browser, so even a two-hour recording is never uploaded anywhere.</p>
<p>Repurposing works because the hard part, recording something worth watching, is already done. In addition, Shorts bring new viewers to your long videos, so each clip should make people curious about the full episode.</p>
${fig(src, 'Markers on a long video and a vertical Short sequence, ready to turn a long video into Shorts', 'Markers on the best moments, a vertical “Short 1” sequence tab, and the Source monitor with an In/Out range.')}
<h2>What makes a good moment when you repurpose long videos</h2>
<p>Look for parts that make sense on their own, without the rest of the video:</p>
<ul><li><strong>One clear tip or answer</strong> — "the one setting that fixed my audio".</li><li><strong>A strong reaction</strong> — surprise, a laugh, a disagreement.</li><li><strong>A before-and-after</strong> or a result you can show in the first second.</li><li><strong>A bold statement</strong> that people want to comment on.</li></ul>
<p>Aim for 15–45 seconds each. If a moment needs a long introduction, it is probably not a Short — and that is fine, because the goal when you turn a long video into Shorts is quality, not quantity.</p>
<h2>Step 1: Import the long video and mark the best moments</h2>
<ol><li>Open <a href="/">the editor</a>, import your recording and drag it onto the timeline.</li><li>Play through it. Whenever something good happens, press <code>M</code> to add a <strong>marker</strong> at the playhead.</li><li>Double-click a marker in the ruler to name it — for example <em>Best tip</em> or <em>Funny moment</em> — and give it a colour.</li><li>Press <code>⇧M</code> to jump from one marker to the next when you come back to them.</li></ol>
${tip('Press <code>L</code> twice to play at double speed while you look for moments; <code>K</code> stops. Long recordings go much faster this way.')}
<h2>Step 2: Make a vertical sequence for each Short</h2>
<ol><li>Choose <strong>Sequence ▸ New Sequence…</strong> and name it after the moment, for example <em>Short 1 — Best tip</em>.</li><li>Open <strong>Sequence ▸ Sequence Settings…</strong>, pick <strong>Vertical 9:16 (1080×1920)</strong> and untick <strong>Match frame size to the first video clip</strong>. Otherwise the landscape footage would switch the sequence back to 16:9.</li><li>Click <strong>Apply</strong>. The new sequence opens as a tab above the timeline, next to your full video.</li></ol>
<h2>Step 3: Bring the moment into the Short</h2>
<ol><li>Double-click the long video in the <strong>Project</strong> panel to open it in the <strong>Source</strong> monitor.</li><li>Find the moment, click inside the Source monitor and press <code>I</code> at the start and <code>O</code> at the end.</li><li>Click the timeline of your Short sequence and press <code>,</code> (Insert). Only the marked part is added.</li></ol>
<p>Each Short has its own tab, so you can switch between them while you work. More detail: <a href="/docs/source-monitor/">the Source monitor</a> and <a href="/docs/sequences/">multiple sequences</a>.</p>
<h2>Step 4: Fill the vertical frame</h2>
<p>A landscape clip sits in the middle of a 9:16 frame with empty space above and below. You have two good options:</p>
<ul><li><strong>Crop in:</strong> select the clip and tick <strong>Scale to fill frame</strong> in <strong>Effect Controls ▸ Motion</strong>, then drag the picture so the speaker's face is centred.</li><li><strong>Keep everything:</strong> drag <strong>Background Blur Fill</strong> from <strong>Effects ▸ Creative Effects</strong> onto the clip. The whole picture stays visible over a blurred copy — ideal for screen recordings and wide shots with two people.</li></ul>
<p>The <a href="/tools/blur-video-background/">blurred background tool</a> and <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">the vertical video guide</a> show both in more detail.</p>
<h2>Step 5: Tighten it and add a hook</h2>
<ul><li>Cut the warm-up. Start on the most interesting sentence, even if it is mid-thought.</li><li>Remove pauses with the razor tool (<code>C</code>) and <strong>Ripple Delete</strong> (<code>⇧Delete</code>).</li><li>Press <code>T</code> and type a short hook at the top, such as <em>"Nobody tells you this"</em>. Click <strong>Safe</strong> under the monitor to keep it clear of YouTube's buttons.</li></ul>
<h2>Step 6: Add captions to every Short</h2>
<p>Open the <strong>Captions</strong> tab and click <strong>Auto-generate</strong> with <strong>Entire sequence</strong> selected. Each Short gets its own captions, made on your device. Then click <strong>Style…</strong> for larger text with a box, and move them up with the margin so they sit above the app's controls. See <a href="/tutorials/add-subtitles-to-video-automatically/">how to add subtitles automatically</a>.</p>
<h2>Step 7: Export all your Shorts</h2>
<ol><li>Click a Short's tab, then <strong>Export</strong>, and choose <strong>YouTube Shorts / Reels / TikTok (9:16)</strong>.</li><li>Name the file after the moment and click <strong>Export</strong>.</li><li>Repeat for each tab. Exports run on your own computer, so each one usually takes seconds.</li><li>Upload them from the YouTube app or YouTube Studio — YouTube lists its current rules in <a href="https://support.google.com/youtube/answer/12779649" target="_blank" rel="noopener">Upload YouTube Shorts</a>.</li></ol>
${tip('Upload the Shorts over several days rather than all at once, and mention the full video in each one — for example "full episode on my channel".')}
<h2>A quicker way to turn a long video into Shorts (one clip)</h2>
<p>Need just one Short? Skip the extra sequences: set In and Out points on the long video's timeline with <code>I</code> and <code>O</code>, and choose <strong>Range ▸ Sequence In/Out</strong> in the export settings. Pair it with the <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> preset and Background Blur Fill for a fast result.</p>
<h2>Frequently asked questions</h2>
<h3>How many Shorts can I make from one long video?</h3>
<p>As many as it has self-contained moments. A one-hour podcast often gives five to ten good clips; a ten-minute tutorial perhaps two or three.</p>
<h3>Can I turn a long video into Shorts without cropping out people?</h3>
<p>Yes. Use <strong>Background Blur Fill</strong>, which keeps the whole frame visible, or place two clips above each other for a split screen.</p>
<h3>Is there a length limit when I repurpose long videos?</h3>
<p>No server limit, because the file opens from your own computer. Very long 4K recordings are smoother on a computer with plenty of memory; <a href="/docs/performance/">proxies</a> help on slower machines.</p>
<h3>Do the Shorts need their own captions?</h3>
<p>Yes — generate them per Short. It is quick, and each clip then works with the sound off.</p>
<p>Next, polish each clip with <a href="/blog/how-to-edit-youtube-shorts/">how to edit YouTube Shorts</a>, or <a href="/">open the editor</a> and start with your latest video.</p>`;

const post = {
  title: 'How to Turn a Long Video into Shorts (Free, in Your Browser)',
  slug: 'turn-long-video-into-shorts',
  section: 'blog', status: 'published',
  publishAt: new Date('2026-11-15T10:00:00+06:00'),
  excerpt: 'Turn one long video into several Shorts: mark the best moments, give each its own vertical sequence, fill the frame, add captions and export them all — free, with nothing uploaded.',
  metaTitle: 'Turn a Long Video into Shorts (Free Guide)',
  metaDescription: 'Turn a long video into Shorts: mark the best moments, cut each into its own 9:16 sequence, fill the frame, add captions and export — free, in your browser.',
  focusKeyword: 'turn a long video into Shorts', synonyms: 'repurpose long videos, long video to shorts, clips from long videos, repurpose a podcast',
  keywords: 'turn long video into shorts, repurpose video, podcast clips, youtube shorts from long video, vertical clips, free',
  category: 'tips',
  featuredImage: { src, alt: IMG.alt },
  contentHtml: html, order: 99,
};

const prev = await d.collection('posts').findOne({ section: 'blog', slug: post.slug });
const { id } = await savePost(prev ? String(prev._id) : null, post, { email: 'content-script' });
const now = await d.collection('posts').findOne({ _id: id });
const others = (await d.collection('posts').find({ _id: { $ne: id }, focusKeyword: { $ne: '' } }).toArray()).map((x) => ({ title: x.title, focusKeyphrase: x.focusKeyword }));
const r = seoReport(now, others);
await d.collection('posts').updateOne({ _id: id }, { $set: { seoScore: r.score } });
console.log(`${process.env.MONGODB_DB}: ${prev ? 'updated' : 'created'} ${post.slug} — publishes ${post.publishAt.toISOString()} — score ${r.score}, ${r.words} words; media ${media._id}`);
console.log('not good:', [...r.seo, ...r.read].filter((x) => x.status !== 'good').map((x) => x.label + ': ' + x.text).join('\n  ') || '—');
process.exit(0);
