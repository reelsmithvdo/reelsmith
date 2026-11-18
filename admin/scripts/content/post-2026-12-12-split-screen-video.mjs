// Blog post, scheduled 2026-12-12 10:00 (Asia/Dhaka): "How to Make a Split-Screen Video". Image: src/assets/shots/splitscreen.jpg
// (scenes-blog.js "splitscreen"). Features: V1/V2, Crop (L/T/R/B %), Position X, Drop Shadow, shapes/colour matte, Creative ▸ Split Screen ×3.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/splitscreen.jpg';
const html = `<p>Two cooks, two cities, before and after, a duet, a phone call — a split screen shows two things happening at once. This guide shows how to make a split-screen video with two clips side by side, how to do top and bottom for vertical video, and how to add a clean divider line. Everything works for free in Reelsmith, an editor that runs in your browser, with nothing uploaded.</p>
${fig(IMG, 'Make a split-screen video: two clips side by side, each cropped 25% left and right and moved to one half of the frame', 'Wok on V1, bakery on V2: each clip cropped 25% on both sides with Crop, then moved half a frame left or right with Position X.')}
<h2>How a split-screen video works</h2>
<p>You stack two clips on <strong>V1</strong> and <strong>V2</strong>, then cut each one down to half the frame with <strong>Crop</strong> and slide it to its side with <strong>Position</strong>. Because the clips keep their original size, nothing gets squashed (<a href="https://en.wikipedia.org/wiki/Split_screen_(video_production)" target="_blank" rel="noopener">split screen has a long history in film and TV</a>).</p>
<h2>Step 1: Stack the two clips</h2>
<ol><li>Open <a href="/">the editor</a> and import both videos.</li><li>Drag the first onto <strong>V1</strong> and the second onto <strong>V2</strong>, starting at the same time.</li><li>If they show the same moment (a duet, a conversation), line them up by the sound: slide one until the waveforms match.</li></ol>
<h2>Step 2: Crop each clip to half</h2>
<ol><li>Drag <strong>Effects ▸ Video Effects ▸ Crop</strong> onto both clips.</li><li>Select the V1 clip and, in <strong>Effect Controls ▸ Crop</strong>, set <strong>Left</strong> to 25% and <strong>Right</strong> to 25%. The middle half of the picture remains.</li><li>Do the same for the V2 clip.</li></ol>
<p>Cropping both sides keeps the subject in the middle of each half. If someone stands off-centre, crop more on one side and less on the other — the total should still be 50%.</p>
<h2>Step 3: Move each half into place</h2>
<p>Select the V1 clip and, in <strong>Effect Controls ▸ Motion</strong>, set <strong>Position X</strong> to minus a quarter of the frame width: −480 for a 1920×1080 sequence (−320 for 1280×720). Set the V2 clip to the same number without the minus. The two halves now sit side by side.</p>
${tip('Instead of typing numbers, drag the clip in the Program monitor: it snaps to the centre and the frame edges, so each half locks into place.')}
<h2>Top and bottom split for vertical video</h2>
<p>In a 9:16 sequence for Shorts, Reels or TikTok, stack the clips vertically instead: crop <strong>Top</strong> and <strong>Bottom</strong> by 25% each, then move one clip up and the other down with <strong>Position Y</strong> (a quarter of the frame height, for example ±480 in 1080×1920). See <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">how to make a vertical video</a>.</p>
<h2>Add a divider line</h2>
<p>A thin line between the halves looks tidy. Choose the <strong>Rectangle</strong> tool, drag a tall, thin shape over the middle of the frame, and set its fill colour in <strong>Effect Controls ▸ Shape</strong>. Put it on <strong>V3</strong> so it sits on top of both clips. See <a href="/docs/shapes/">Shapes and color mattes</a>.</p>
<h2>Label each side</h2>
<p>Press <code>T</code>, click in one half of the Program monitor and type a label such as "Before" or "Lisbon". Then do the same on the other side. For a stronger look, apply <strong>Effects ▸ Text Styles ▸ Subtitle Box</strong>.</p>
<h2>Quick alternatives</h2>
<ul><li><strong>Three copies of one clip:</strong> <strong>Effects ▸ Creative Effects ▸ Split Screen ×3</strong> repeats a single clip in three panels — great for music edits.</li><li><strong>Big and small instead of half and half:</strong> a <a href="/blog/how-to-make-a-picture-in-picture-video/">picture-in-picture</a> keeps one video full-screen.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Why is one half black?</h3>
<p>A clip ended, or it is cropped but not moved. Check that both clips cover the same time and that their Position X values are opposite.</p>
<h3>Can I split the screen into four?</h3>
<p>Yes. Put four clips on V1–V4, crop each to a quarter (25% on each side and 25% top and bottom) and move them to the four corners with Position X and Y.</p>
<h3>Which sound will I hear?</h3>
<p>Both clips' sound plays. Lower or mute the one you don't need in Effect Controls ▸ Audio or with the track's M button.</p>
<h3>Are my videos uploaded?</h3>
<p>No. Editing and exporting happen on your own device.</p>
<p>Ready? <a href="/">Open the editor</a> and put two stories side by side.</p>`;

await savePostScript({
  title: 'How to Make a Split-Screen Video (Side by Side, Free)',
  slug: 'how-to-make-a-split-screen-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-12T10:00:00+06:00'),
  excerpt: 'Make a split-screen video with two clips side by side — or top and bottom for vertical video — using Crop and Position, plus a divider line and labels. Free in your browser.',
  metaTitle: 'How to Make a Split-Screen Video (Free)',
  metaDescription: 'Make a split-screen video: put two clips side by side or top and bottom with Crop and Position, add a divider and labels — free in your browser, no upload.',
  focusKeyword: 'split-screen video', synonyms: 'split screen, side by side video, two videos at once, video collage, before and after video',
  keywords: 'split screen video, side by side video, two videos one screen, crop video, before and after, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Split-screen video: two cropped clips side by side with Crop and Position settings' },
  contentHtml: html, order: 99,
});
process.exit(0);
