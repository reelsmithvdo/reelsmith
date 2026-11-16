// Blog post, 2026-11-16: "How to Compress a Video Without Losing Quality". Image: src/assets/shots/compress.jpg
// (scripts/shots/scenes.js "compress"). Sizes per minute follow the Export dialog's own estimate (exporter.js bitrate()).
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/compress.jpg';
const html = `<p>Need a smaller file for email, a chat app or a slow upload? This guide shows how to compress a video without losing quality you can actually see — by choosing the right frame size and quality, and checking the file size before you export. It all happens in Reelsmith, a free editor that runs in your browser, so your video is never uploaded anywhere.</p>
<p>No compression is truly lossless. However, a phone or laptop screen can't show most of the detail a camera records, so a well-chosen smaller file looks the same to viewers at a fraction of the size.</p>
${fig(IMG, 'Export settings to compress a video without losing quality: Custom preset, 1280×720 HD, Medium quality and the estimated file size', 'Custom export at 1280×720 and Medium quality: two minutes come to about 34 MB.')}
<h2>What decides the size of a video file</h2>
<p>Three things decide how big an exported video is:</p>
<ul><li><strong>Length.</strong> For example, twice as long means twice as big. Cutting what nobody needs is the only compression that loses nothing at all.</li><li><strong>Bitrate (Quality).</strong> How much data each second gets. In other words, this is the biggest lever.</li><li><strong>Frame size (resolution).</strong> 1280×720 has less than half the pixels of 1920×1080; therefore it needs much less data for the same sharpness.</li></ul>
<p>As a result, the best way to compress a video without losing quality is to trim first, then lower the resolution a step, and only then lower the quality.</p>
<h2>Step 1: Trim before you compress a video</h2>
<ol><li>Open <a href="/">the editor</a>, click <strong>Import</strong> and drag your video onto the timeline.</li><li>Cut the slow start and the end: press <code>C</code> for the razor tool, click where the good part begins, then select the piece before it and press <strong>⇧Delete</strong> (Ripple Delete).</li><li>Also, want to keep the timeline but export only one part? Set In and Out points with <code>I</code> and <code>O</code> and choose <strong>Range ▸ Sequence In/Out</strong> when you export.</li></ol>
<p>More ways to shorten a clip: <a href="/tools/trim-video/">trim a video online</a>.</p>
<h2>Step 2: Open Export and choose Custom</h2>
<p>Click <strong>Export</strong> in the top right (or press <code>⌘M</code>). For a quick small file, the <strong>Review copy (small file)</strong> preset is enough. However, for more control, set <strong>Preset</strong> to <strong>Custom</strong> and follow the next two steps.</p>
<h2>Step 3: Choose a smaller frame size</h2>
<p>Open <strong>Frame size</strong> and pick <strong>1280×720 — HD</strong>. For most videos watched on phones, laptops or in chats, 720p still looks sharp. On the other hand, keep <strong>1920×1080 — Full HD</strong> for YouTube uploads and big screens.</p>
${tip('Never pick a frame size larger than your original. Scaling up makes the file bigger without adding any detail.')}
<h2>Step 4: Choose the quality and compress the video</h2>
<p><strong>Quality</strong> has three levels: <strong>High</strong>, <strong>Medium</strong> and <strong>Low (small file)</strong>. Medium is the sweet spot for most videos; in contrast, Low is fine for talking heads, slides and screen recordings, where little moves.</p>
<p>Approximate size per minute at 30 frames per second, as the Export dialog estimates it:</p>
<table><thead><tr><th>Frame size</th><th>High</th><th>Medium</th><th>Low</th></tr></thead><tbody><tr><td>1920×1080</td><td>64 MB</td><td>37 MB</td><td>21 MB</td></tr><tr><td>1280×720</td><td>29 MB</td><td>17 MB</td><td>12 MB</td></tr></tbody></table>
<p>Real files can come out a little different, because the encoder spends fewer bits on simple scenes.</p>
<h2>Step 5: Check the estimate and compress the video</h2>
<ol><li>Look at the summary at the bottom of the dialog: it shows the frame size, the range and the <strong>Estimated file size</strong>, updated as you change settings.</li><li>Too big? Then lower the quality one step or shorten the range, and watch the estimate drop.</li><li>Finally, click <strong>Export</strong>. Compression runs on your own computer, usually much faster than real time.</li></ol>
<p>Every setting is explained in <a href="/docs/export/">Exporting a video</a>.</p>
<h2>MP4 or WebM: which format is smaller?</h2>
<p><strong>H.264 (.mp4)</strong> plays everywhere — phones, TVs, email previews and every social app — so it is the safe choice. <strong>VP9 (.webm)</strong>, by comparison, is often a little smaller at the same quality, and it is fine for websites and Chrome-based apps. Which formats appear depends on what your browser can encode.</p>
<h2>How small does it need to be?</h2>
<ul><li><strong>Email:</strong> personal Gmail accounts can attach up to 25 MB, and bigger files are sent as a Google Drive link instead (<a href="https://support.google.com/mail/answer/6584" target="_blank" rel="noopener">Gmail Help</a>). A two-minute clip at 1280×720 and Low quality fits.</li><li><strong>Chat apps:</strong> 720p at Medium usually looks clean on a phone. Most apps also compress again when you send, so starting from a clean 720p file avoids a second, blurrier round.</li><li><strong>YouTube and Vimeo:</strong> don't compress much at all — the platform compresses again, so upload a high-quality file.</li></ul>
<h2>Mistakes that cost quality</h2>
<ul><li><strong>Compressing twice.</strong> Each round throws away more detail. Always export from the original file.</li><li><strong>Shrinking the frame too far.</strong> Below 720p, text and faces start to look soft.</li><li><strong>Starving fast motion.</strong> Sports and gaming need more data, so use Medium or High for them.</li><li><strong>Forgetting the sound.</strong> Audio is a small part of the file, so there is no need to remove it to save space. Instead, cut silent parts of the video itself.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I compress a video without losing quality at all?</h3>
<p>Only by cutting it shorter. Any lower bitrate or resolution removes some data, but at sensible settings the difference is invisible on a normal screen.</p>
<h3>Is my video uploaded when I compress it?</h3>
<p>No. Reelsmith reads the file from your computer and encodes it there. Read <a href="/blog/private-video-editing-in-the-browser/">why your videos never leave your computer</a>.</p>
<h3>How long does it take to compress a video?</h3>
<p>Usually less than the length of the video. Because Reelsmith encodes on your own graphics hardware, a two-minute clip at 720p often takes well under a minute on a recent laptop. Older computers and phones are slower, and the progress window shows the speed while it works.</p>
<h3>Can I compress several videos at once?</h3>
<p>Export them one after another: import each video, put it on the timeline and export. It usually takes seconds.</p>
<h3>Does it work on a phone?</h3>
<p>Yes. The editor works in mobile browsers; big 4K files are smoother on a computer.</p>
<p>Ready? Use the <a href="/tools/compress-video/">free video compressor</a>, or <a href="/tools/resize-video/">resize the video</a> for a specific platform first.</p>`;

await savePostScript({
  title: 'How to Compress a Video Without Losing Quality (Free, No Upload)',
  slug: 'compress-video-without-losing-quality',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-16T09:00:00+06:00'),
  excerpt: 'Make a video smaller for email, chat or upload without visible loss: trim it, pick 720p and the right quality, and check the estimated size before you export — free, in your browser.',
  metaTitle: 'Compress a Video Without Losing Quality (Free)',
  metaDescription: 'Compress a video without losing quality: trim it, choose 720p and the right quality, check the estimated size and export — free, private, in your browser.',
  focusKeyword: 'compress a video', synonyms: 'compress video, compressing a video, reduce video file size, make a video smaller, video compressor',
  keywords: 'compress video, reduce video size, video compressor free, smaller mp4, compress video for email, 720p, bitrate',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Export settings to compress a video without losing quality: 1280×720, Medium quality and the estimated file size' },
  contentHtml: html, order: 99,
});
process.exit(0);
