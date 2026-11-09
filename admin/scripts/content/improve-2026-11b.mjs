// Second content pass (Nov 2026): targeted fixes from the SEO checks after improve-2026-11.mjs.
// Applies text replacements to the current posts (each must match exactly once) and saves through savePost.
import { db } from '../../lib/db.js';
import { savePost } from '../../lib/posts.js';
import { seoReport } from '../../lib/score.js';

const tip = (html) => `<blockquote><p><strong>Tip:</strong> ${html}</p></blockquote>`;

// slug: { meta: {...fields}, edits: [[find, replace], ...] }
const FIX = {
  'add-subtitles-to-video-automatically': {
    edits: [
      ['alt="Captions panel with generated subtitles on the CC track"', 'alt="Add subtitles to video automatically: generated captions in the Captions panel and on the CC track"'],
      ['<h2>2. Generate the captions</h2>', '<h2>2. Generate auto captions</h2>'],
      ['<h2>3. Check and fix the words</h2>', '<h2>3. Check and fix the automatic subtitles</h2>'],
      ['<h2>Hide captions without deleting them</h2>', `<h2>How long does it take to add subtitles to a video?</h2>
<p>On a recent laptop with the <strong>Base</strong> model, a one-minute video usually takes well under a minute to transcribe in Chrome or Edge. In addition, the first run includes the one-time model download. As a result, longer videos are best captioned in parts: set In and Out points around each section and choose <strong>In to Out</strong>.</p>
<p>Correcting the text is usually the slowest part. For example, a five-minute interview might need a dozen fixes for names and brands. However, that is still much faster than typing every line yourself.</p>
<h2>Hide captions without deleting them</h2>`],
    ],
  },
  'remove-video-background': {
    edits: [
      ['alt="An overlay with its white background removed over a main video"', 'alt="Remove video background: an overlay with its white background removed over the main video"'],
      ['<h2>Fixing common problems</h2>', '<h2>Fixing common problems when you remove a video background</h2>'],
      ['<h2>When colour removal isn\'t enough</h2>', `<h2>Remove video background for a logo watermark</h2>
<p>A transparent logo in a corner makes your videos look consistent. First, remove the logo's background as shown above. Then place it on the top video track for the whole length of the video, scale it to about 10–15 % of the frame width, and lower it in <strong>Effect Controls ▸ Opacity</strong> so it doesn't distract. Finally, check it against both light and dark scenes.</p>
<h2>When colour removal isn't enough</h2>`],
      ['<p>Overlay graphics are everywhere:', '<p>Overlay graphics are everywhere, for example:'],
    ],
  },
  'vertical-video-for-shorts-reels-tiktok': {
    meta: { metaTitle: 'Vertical Video for Shorts, Reels and TikTok', metaDescription: 'Make a vertical video in 9:16 for Shorts, Reels and TikTok: reframe landscape clips, add captions and export 1080×1920 — free, in your browser.' },
    edits: [
      ['<h2>If you filmed vertically</h2>', '<h2>If you filmed a vertical video on your phone</h2>'],
      ['<h2>Export at the right size</h2>', `<h2>Common vertical video mistakes</h2>
<ul><li><strong>Text at the very top or bottom.</strong> As a result, the app's buttons cover it; keep it in the middle.</li><li><strong>Black bars above and below.</strong> Instead, scale the clip up or use Background Blur Fill.</li><li><strong>A slow first second.</strong> Viewers decide fast, so open on the best moment.</li><li><strong>Exporting landscape by mistake.</strong> Check that the export preset says 9:16 before you click Export.</li></ul>
<h2>Export your vertical video at the right size</h2>`],
      ['<p>Most people scroll with the sound off, so text matters:</p>', '<p>Most people scroll with the sound off. Therefore, on-screen text matters:</p>'],
    ],
  },
  'animated-text-titles': {
    meta: { metaDescription: 'Make animated text for video in your browser: title templates, 3D and gradient styles, word-by-word animation and tips for readable titles. Free.' },
    edits: [
      ['<h2>Animate the text</h2>', '<h2>Add animated text: In, Out and Loop</h2>'],
      ['<h2>Which text animation to use</h2>', '<h2>Which animated text style to use</h2>'],
      ['<h2>One-click text styles</h2>', '<h2>One-click styles for animated text</h2>'],
      ['and <a href="/docs/text-effects/">3D, gradient, halftone and animated text</a>.', 'and <a href="/docs/text-effects/">3D, gradient and halftone text effects</a>.'],
      ['<h2>Tips for titles that read well</h2>', `<h2>Make animated text match the beat</h2>
<p>Titles feel more professional when they appear on a beat or a sound. First, play the music and press <code>M</code> to add a marker on each beat. Then drag the title so it starts on a marker. Finally, add a <strong>Pop</strong> sound from <strong>Effects ▸ Sound Effects</strong> at the same point. For example, a three-word hook can pop in word by word on three beats with <strong>Words Pop</strong>.</p>
<h2>Tips for titles that read well</h2>`],
    ],
  },
  'make-quiet-audio-louder': {
    edits: [
      ['alt="Effect Controls showing Volume at 180 percent and a Compressor on a speech clip"', 'alt="Make audio louder: Effect Controls with Volume at 180 percent and a Compressor on a speech clip"'],
      ['<h2>Better: normalize the loudness</h2>', '<h2>Better: make audio louder evenly with Normalize Loudness</h2>'],
      ['<h2>Even out loud and quiet parts</h2>', '<h2>Boost audio without distortion: even out loud and quiet parts</h2>'],
      ['<h2>A quick recipe for clear, loud speech</h2>', `<h2>Make audio louder on a phone</h2>
<p>The same tools work in the mobile editor. Tap the clip, then open the <strong>Edit</strong> sheet at the bottom of the screen and raise <strong>Volume</strong>. In addition, use headphones while checking: phone speakers hide low-frequency rumble and make quiet speech sound louder than it is.</p>
<h2>A quick recipe for clear, loud speech</h2>`],
    ],
  },
  'add-subscribe-button-to-video': {
    meta: { metaTitle: 'Subscribe Button Animation for Your Video (Free)' },
    edits: [
      ['<h2>1. Open the Library</h2>', '<h2>1. Open the Library of subscribe button animations</h2>'],
      ['<h2>Where to put the subscribe button</h2>', `<h2>Why add a subscribe button?</h2>
<p>Many viewers like a video but forget to subscribe. A short, friendly reminder at the right moment turns some of them into subscribers. However, timing matters: a button in the first seconds, before you have delivered anything, is easy to ignore. Instead, show it right after a useful tip or a funny moment, and then once more near the end.</p>
<h2>Where to put the subscribe button</h2>`],
    ],
  },
  'editing-tips-for-short-videos': {
    meta: { metaTitle: '7 Editing Tips for Short Videos', metaDescription: 'Seven editing tips for short videos on Shorts, Reels and TikTok: strong hooks, tight cuts, captions, on-screen text, pacing, sound and framing.' },
    edits: [
      ['alt="Zoom Punch applied to a clip, with the Effects panel filtered by zoom"', 'alt="Editing tips in practice: Zoom Punch applied to a clip, with the Effects panel filtered by zoom"'],
      ['<h2>Bonus editing tips: speed, freeze and reverse</h2>', `<h2>Editing tips for the first three seconds</h2>
<p>The opening decides whether people stay. For example, start mid-action rather than with a greeting, show the finished result before the steps, or put a question on screen. In addition, avoid logos and intros at the start of a short: save branding for the end. As a result, viewers see why they should keep watching straight away.</p>
<h2>Bonus editing tips: speed, freeze and reverse</h2>`],
      ['<h2>A 60-second checklist before you export</h2>', '<h2>Short video editing checklist before you export</h2>'],
    ],
  },
  'introducing-reelsmith': {
    meta: { metaTitle: 'Free Video Editor in Your Browser: Reelsmith', metaDescription: 'Reelsmith is a free video editor that runs in your browser: a multi-track timeline, titles, color, audio tools and auto captions. No upload, no watermark.' },
    edits: [
      ['<h2>What you get</h2>', '<h2>What you get in this free video editor</h2>'],
      ['<h2>Nothing to upload</h2>', `<h2>How it works</h2>
<p>Modern browsers can decode and encode video with your computer's own hardware through the <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API" target="_blank" rel="noopener">WebCodecs API</a>. Reelsmith builds a full editor on top of it, so playback, effects and export all run locally. In other words, the website delivers the editor, and your computer does the editing.</p>
<h2>Nothing to upload</h2>`],
    ],
  },
  'private-video-editing-in-the-browser': {
    meta: { metaTitle: 'Video Editing in the Browser, Privately', metaDescription: 'How video editing in the browser keeps files private: Reelsmith edits, captions and exports on your own computer with WebCodecs. Nothing is uploaded.' },
    edits: [
      ['alt="The Reelsmith start screen with Open From Computer and a drop zone"', 'alt="Video editing in the browser: the Reelsmith start screen with Open From Computer and a drop zone"'],
      ['<h2>The browser has become a video workstation</h2>', '<h2>Video editing in the browser: the browser is now a workstation</h2>'],
      ['<h2>The trade-offs</h2>', `<h2>Private video editing vs. cloud editors</h2>
<p>Cloud editors copy your footage to their servers, process it there and send back a result. That is convenient for collaboration. However, it means waiting for uploads, accepting storage limits and trusting another company with your files. In contrast, video editing in the browser with Reelsmith keeps everything on your device. As a result, it suits client work, family videos and anything under an agreement not to share.</p>
<h2>The trade-offs</h2>`],
    ],
  },
};

const d = await db();
const all = await d.collection('posts').find({}).toArray();
let failed = 0;
for (const [slug, f] of Object.entries(FIX)) {
  const prev = all.find((p) => p.slug === slug);
  let html = prev.contentHtml;
  for (const [a, b] of f.edits || []) {
    const n = html.split(a).length - 1;
    if (n !== 1) { console.log(`  ✗ ${slug}: expected 1 match, found ${n}: ${a.slice(0, 70)}`); failed++; continue; }
    html = html.replace(a, b);
  }
  const input = { ...prev, ...(f.meta || {}), status: 'published', keywords: prev.keywords, contentHtml: html };
  await savePost(String(prev._id), input, { email: 'content-script' });
  const now = await d.collection('posts').findOne({ slug });
  const others = all.filter((x) => x.slug !== slug && x.focusKeyword).map((x) => ({ title: x.title, focusKeyphrase: x.focusKeyword }));
  const r = seoReport(now, others);
  const bad = [...r.seo, ...r.read].filter((x) => x.status !== 'good').map((x) => x.label);
  console.log(`${slug}: ${prev.seoScore} → ${r.score} (${r.words} words) still: ${bad.join(', ') || '—'}`);
  await d.collection('posts').updateOne({ _id: prev._id }, { $set: { seoScore: r.score } });
}
process.exit(failed ? 1 : 0);
