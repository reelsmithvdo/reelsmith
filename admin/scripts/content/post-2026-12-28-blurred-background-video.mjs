// Blog post, scheduled 2026-12-28 10:00 (Asia/Dhaka): "How to Add a Blurred Background to a Video". Topic from Search
// Console ("blur background vertical video"). Image: src/assets/shots/blurbg.jpg (scenes-blog2.js "blurbg").
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/blurbg.jpg';
const html = `<p>You filmed upright on your phone, but you want to post on YouTube. Or you have a landscape clip, but you want it as a Reel. Either way the shape doesn't fit, and you get black bars. The popular fix is a blurred background: the video stays whole in the middle, and the empty space is filled with a soft, blurred copy of itself. This guide shows how to add a blurred background to a video in both directions — vertical into horizontal, and horizontal into vertical — for free in Reelsmith, an editor that runs in your browser. Your video is never uploaded.</p>
${fig(IMG, 'Blurred background for a vertical video: a 9:16 phone clip in a 16:9 frame with Background Blur Fill on the sides', 'A vertical phone clip in a 16:9 sequence. Background Blur Fill fills the sides with a blurred copy; its strength is in Effect Controls.')}
<h2>Why use a blurred background instead of black bars?</h2>
<p>Black bars on the sides of a vertical video are called pillarboxing (<a href="https://en.wikipedia.org/wiki/Pillarbox" target="_blank" rel="noopener">background on Wikipedia</a>). They work, but they look empty and make the video seem small. A blurred background keeps the colours and movement of the clip across the whole screen, so the frame feels full, while the picture itself isn't cropped. Cropping, on the other hand, fills the frame but cuts off part of the picture — fine for a face, bad for a wide view or a screen recording.</p>
<h2>Vertical video into a horizontal frame (for YouTube)</h2>
<ol><li>Open <a href="/">the editor</a> and choose <strong>Sequence ▸ Sequence Settings…</strong> ▸ <strong>HD 1080p (1920×1080)</strong>.</li><li>Click <strong>Import</strong> and drag your vertical clip onto the timeline. It sits in the middle with empty space left and right.</li><li>Open <strong>Effects ▸ Creative Effects</strong> and drag <strong>Background Blur Fill</strong> onto the clip.</li><li>Press Space to check it, then export with <strong>YouTube 1080p Full HD</strong>.</li></ol>
${tip('Several vertical clips? Select them all on the timeline, then double-click Background Blur Fill in the Effects panel: it is applied to every selected clip.')}
<h2>Horizontal video into a vertical frame (for Shorts, Reels and TikTok)</h2>
<ol><li>Choose <strong>Sequence ▸ Sequence Settings…</strong> ▸ <strong>Vertical 9:16 (1080×1920)</strong>. On the start screen, the <strong>Shorts / Reels / TikTok</strong> template does the same.</li><li>Drag your landscape clip onto the timeline. It appears as a band across the middle.</li><li>Apply <strong>Background Blur Fill</strong> as above. The space above and below fills with the blurred copy.</li><li>Export with <strong>YouTube Shorts / Reels / TikTok (9:16)</strong>.</li></ol>
<p>The blurred band at the top is a natural place for a headline; press <code>T</code> and type it there. For square posts, choose <strong>Square 1:1</strong> or <strong>Portrait 4:5</strong> instead — the effect works with any frame size.</p>
<h2>Adjust the look</h2>
<ul><li><strong>Blur strength:</strong> select the clip and move the <strong>Background Blur Fill</strong> slider in <strong>Effect Controls ▸ Creative Effects</strong>. Stronger blur looks calmer; weaker blur shows more of the scene.</li><li><strong>Make the main picture bigger:</strong> for example, raise <strong>Scale</strong> in <strong>Effect Controls ▸ Motion</strong> a little, to about 115 %. The video crops slightly at its edges but fills more of the frame.</li><li><strong>Move the subject:</strong> similarly, change <strong>Position</strong> in Motion to keep a face or product where you want it.</li><li><strong>Match the colours:</strong> if the clip is dull, <a href="/blog/how-to-color-correct-a-video/">colour correct it</a> first — the blurred copy follows automatically.</li></ul>
<h2>Other ways to fill the empty space</h2>
<ul><li><strong>Crop to fill:</strong> right-click the clip ▸ <strong>Scale to Fill Frame</strong>. Best for close-ups of people.</li><li><strong>A solid colour:</strong> put a <strong>Color Matte</strong> on the track below the clip, in your brand colour.</li><li><strong>A split screen:</strong> show two vertical clips side by side in a horizontal frame — see <a href="/blog/how-to-make-a-split-screen-video/">how to make a split-screen video</a>.</li><li><strong>A face-cam:</strong> for reactions and tutorials, a <a href="/blog/how-to-make-a-picture-in-picture-video/">picture-in-picture</a> layout often works better than blur.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Is this the same as blurring a face?</h3>
<p>No. A blurred background fills the space around the video. To hide a face or a number plate inside the picture, see <a href="/blog/how-to-blur-a-face-in-a-video/">how to blur a face in a video</a>.</p>
<h3>Does the blurred background lower the quality of my video?</h3>
<p>No. The main picture is drawn sharp on top; only the copy behind it is blurred.</p>
<h3>Can I add a blurred background on my phone?</h3>
<p>Yes. Open reelsmithapp.com in your phone's browser, open the Effects tab and apply Background Blur Fill to the clip. See <a href="/blog/edit-video-on-phone-in-browser/">editing video on a phone</a>.</p>
<h3>Is my video uploaded?</h3>
<p>No. Everything happens on your device, and the export has no watermark.</p>
<p>Try it now with the <a href="/tools/blur-video-background/">free tool page</a>, or read <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">how to make vertical video for Shorts, Reels and TikTok</a>.</p>`;

await savePostScript({
  title: 'How to Add a Blurred Background to a Vertical or Horizontal Video',
  slug: 'blurred-background-for-vertical-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-28T10:00:00+06:00'),
  excerpt: 'Put a vertical video in a horizontal frame (or the other way round) without black bars: fill the empty space with a blurred copy — free in your browser.',
  metaTitle: 'Blurred Background for Vertical Video: Free Guide',
  metaDescription: 'Add a blurred background to a video: fit a vertical clip into 16:9 for YouTube or a landscape clip into 9:16 for Reels, without black bars. Free, no upload.',
  focusKeyword: 'blurred background', synonyms: 'blur background vertical video, blurred sides, vertical video on YouTube, no black bars, background blur fill',
  keywords: 'blurred background video, blur background vertical video, vertical to horizontal, horizontal to vertical, no black bars, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Blurred background: a vertical phone clip in a 16:9 frame with blurred sides' },
  contentHtml: html, order: 99,
});
process.exit(0);
