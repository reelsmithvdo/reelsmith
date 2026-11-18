// Blog post, scheduled 2026-12-08 10:00 (Asia/Dhaka): "How to Add a Logo or Watermark to a Video". Image: src/assets/shots/logo.jpg
// (scenes-blog.js "logo"). Features: PNG on V2, Motion (Scale/Position), Opacity, image Remove Background…, animations.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/logo.jpg';
const html = `<p>A small logo in the corner tells viewers whose video they are watching — and makes it harder for others to pass your work off as their own. This guide shows how to add a logo to a video as a watermark: place it, size it, make it see-through and keep it on screen for the whole video. It takes about two minutes in Reelsmith, a free editor that runs in your browser, and it never adds a watermark of its own.</p>
${fig(IMG, 'Add a logo to a video: a round PNG logo on V2 in the top-right corner of a cooking video, Scale 16% and Opacity 85%', "A round PNG logo on V2 over a cooking video: Scale 16%, moved to the top-right corner and Opacity 85%.")}
<h2>Prepare your logo file</h2>
<ul><li><strong>Use a PNG with a transparent background.</strong> Then only the logo shows, not a white box around it.</li><li><strong>Make it big enough</strong> — at least 500 px wide. You'll scale it down in the editor, and a large file stays sharp.</li><li><strong>A simple version works best.</strong> A symbol or short name reads better in a corner than a detailed logo with small text.</li></ul>
<p>Only have a JPG with a white or coloured background? Put it on the timeline, right-click it ▸ <strong>Remove Background…</strong>, and Reelsmith removes the plain background for you.</p>
<h2>Step 1: Put the logo above your video</h2>
<ol><li>Open <a href="/">the editor</a> and import your video and the logo file.</li><li>Drag the video onto <strong>V1</strong>.</li><li>Drag the logo onto <strong>V2</strong>, above the start of the video. Anything on V2 is drawn on top of V1.</li></ol>
<h2>Step 2: Make the logo last the whole video</h2>
<p>An image starts as a five-second clip. Drag its right edge until it reaches the end of the video. Turn on snapping (<code>S</code>) so it locks exactly to the end of the last clip.</p>
<h2>Step 3: Size and place the logo</h2>
<ol><li>Click the logo clip and open <strong>Effect Controls ▸ Motion</strong>.</li><li>Lower <strong>Scale</strong> until the logo is small — usually 10–20% of its size.</li><li>Drag the logo in the Program monitor into a corner, or set <strong>Position X/Y</strong>.</li></ol>
${tip('Click Safe in the Program monitor and keep the logo inside the inner guide. TVs and some apps crop the edges, and platform buttons often cover the corners on phones.')}
<h2>Step 4: Make it see-through</h2>
<p>In <strong>Effect Controls ▸ Opacity</strong>, lower <strong>Opacity</strong> to 60–85%. A watermark should be visible without pulling attention from the video. On busy footage, a slightly higher opacity or a <strong>Drop Shadow</strong> (Effects ▸ Video Effects) keeps it readable.</p>
<h2>Which corner should the logo go in?</h2>
<ul><li><strong>Top right</strong> is the TV convention and rarely gets in the way (<a href="https://en.wikipedia.org/wiki/Digital_on-screen_graphic" target="_blank" rel="noopener">TV channels call it a "bug"</a>).</li><li><strong>Bottom right</strong> works for landscape YouTube videos, but YouTube shows its own buttons there at the end of a video.</li><li><strong>For Shorts, Reels and TikTok,</strong> avoid the right side and the bottom — the like, comment and caption overlays cover them. Top left or top centre is safest.</li></ul>
<h2>Make the logo appear in style</h2>
<ul><li><strong>Fade in:</strong> set <strong>Fade In</strong> to 1 s in Effect Controls ▸ Opacity.</li><li><strong>Pop in at the start:</strong> drag <strong>Animations — In ▸ Pop</strong> onto the logo.</li><li><strong>Big logo intro, small watermark after:</strong> use keyframes on Scale and Position — start large in the centre, then shrink into the corner. See <a href="/docs/effect-controls/">Effect Controls and keyframes</a>.</li></ul>
<h2>Add a text watermark instead</h2>
<p>No logo yet? Press <code>T</code>, click in the Program monitor and type your channel name or website. Style it in <strong>Effect Controls ▸ Text</strong>, lower its opacity and place it like a logo. More in <a href="/tools/add-text-to-video/">add text to a video</a>.</p>
<h2>Frequently asked questions</h2>
<h3>Why does my logo have a white box around it?</h3>
<p>The file isn't transparent. Use a PNG with a transparent background, or right-click the logo ▸ Remove Background….</p>
<h3>Can I add the same logo to many videos quickly?</h3>
<p>Yes. Copy the logo clip (<code>⌘C</code>) in one project and paste it (<code>⌘V</code>) at the playhead in the next. It keeps its size, position and opacity.</p>
<h3>Does Reelsmith add its own watermark?</h3>
<p>No. Exports are always clean — only your logo appears.</p>
<h3>Is my video uploaded?</h3>
<p>No. Everything happens in your browser, on your device.</p>
<p>Ready? <a href="/">Open the editor</a> and brand your next video.</p>`;

await savePostScript({
  title: 'How to Add a Logo or Watermark to a Video (Free)',
  slug: 'add-logo-watermark-to-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-08T10:00:00+06:00'),
  excerpt: 'Add a logo to a video as a watermark: a transparent PNG on V2, scaled into a corner, made see-through and kept on screen the whole time — free in your browser.',
  metaTitle: 'How to Add a Logo to a Video (Free Watermark)',
  metaDescription: 'Add a logo to a video as a watermark: place a transparent PNG, scale it into a corner, lower the opacity and keep it on screen — free, in your browser.',
  focusKeyword: 'add a logo to a video', synonyms: 'watermark, add watermark to video, logo overlay, brand your video, channel logo',
  keywords: 'add logo to video, watermark video, logo overlay, transparent png, opacity, branding, free video editor',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Add a logo to a video: PNG logo in the top-right corner with Scale and Opacity in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
