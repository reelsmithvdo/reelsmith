// Blog post, scheduled 2026-12-24 10:00 (Asia/Dhaka): "How to Add Text to a Video Without a Watermark". Topic from
// Search Console ("add text to video online free without watermark"). Image: src/assets/shots/addtext.jpg (scenes-blog2.js).
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/addtext.jpg';
const html = `<p>A few words on screen make a video easier to follow: a headline in the first second, a place name, a price, a "link in bio". Many free apps let you add text to a video and then stamp their own logo on the result. This guide shows how to add text to a video without a watermark — type it, style it, time it and animate it — for free in Reelsmith, an editor that runs in your browser. Your video is never uploaded, and you don't need an account.</p>
${fig(IMG, 'Add text to a video without a watermark: a two-tone title over a brunch clip, with font, size and colour in Effect Controls', 'A Two-Tone title over a café clip. Font, size, fill, stroke, shadow and background are in Effect Controls ▸ Text.')}
<h2>Step 1: Import your video</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>, or drag the file onto the window.</li><li>Drag the clip onto the timeline (track <strong>V1</strong>).</li></ol>
<h2>Step 2: Add text to the video</h2>
<ol><li>Press <code>T</code> for the Type tool and click on the picture in the <strong>Program</strong> monitor where the text should go.</li><li>Type your words. Press Enter for a new line.</li><li>Click outside the text when you're done, and press <code>V</code> to go back to the Selection tool.</li></ol>
<p>As a result, the text becomes its own clip on the track above the video. Therefore it shows only while that clip is on the timeline: drag its left and right edges to set when it appears and disappears. More in <a href="/docs/titles/">Titles</a>.</p>
${tip('Keep each text on screen long enough to read it twice. A simple rule: about one second for every three words, and never less than two seconds.')}
<h2>Step 3: Style the text</h2>
<p>Select the text clip and open <strong>Effect Controls ▸ Text</strong>. There you set the <strong>Font</strong>, <strong>Size</strong>, bold or italic, alignment, <strong>Fill</strong> colour, <strong>Stroke</strong> (an outline), <strong>Shadow</strong> and a <strong>Background</strong> box with its own colour and opacity.</p>
<p>For a ready-made look, open <strong>Effects ▸ Text Styles</strong> and apply one to the selected text — for example <strong>Sticker Outline</strong>, <strong>Neon</strong>, <strong>Subtitle Box</strong>, <strong>Gradient Bold</strong> or <strong>Retro Pop 3D</strong>. With <strong>Two-Tone</strong>, wrap a word in asterisks, like <code>best brunch *in Lisbon*</code>, and it gets the second colour.</p>
<h2>Step 4: Place the text where people can read it</h2>
<ul><li><strong>Drag it</strong> in the Program monitor, or set <strong>Position</strong> in <strong>Effect Controls ▸ Motion</strong>.</li><li><strong>Click Safe</strong> under the Program monitor to show the safe margins, and keep text inside them. On Shorts, Reels and TikTok, the app's own buttons cover the bottom and right edges.</li><li><strong>Make it stand out from the picture.</strong> Light text needs a dark outline, a shadow or a background box. The web's accessibility guidelines recommend a contrast ratio of at least 4.5:1 for normal text (<a href="https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html" target="_blank" rel="noopener">W3C: contrast minimum</a>) — a useful target for video, too.</li></ul>
<h2>Step 5: Animate the text (optional)</h2>
<p>Movement draws the eye. Drag an animation from <strong>Effects ▸ Animations — In</strong> onto the text clip: <strong>Words Pop</strong> brings in one word at a time, <strong>Typewriter</strong> types it letter by letter, and <strong>Fade Up</strong> is calm and elegant. <strong>Animations — Out</strong> has matching exits. Alternatively, start from <strong>Effects ▸ Title Templates</strong> — Lower Third, Call to Action, Chapter Title and others are animated already; just change the words. See <a href="/tutorials/animated-text-titles/">how to make animated text and 3D titles</a> for more.</p>
<h2>Step 6: Export the video with text</h2>
<p>Click <strong>Export</strong>, choose a preset — for example <strong>YouTube 1080p Full HD</strong> or <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> — and click <strong>Export</strong>. Every visible text clip is drawn into the video. There is no watermark, no logo and no time limit, because Reelsmith is free and earns from ads on its website, not from your exports.</p>
<h2>Ideas: what text to add to a video</h2>
<ul><li><strong>A hook in the first second:</strong> "3 mistakes everyone makes with…" keeps people watching.</li><li><strong>Names and places:</strong> a lower third with a person's name and role, or the city you're in.</li><li><strong>Steps and numbers:</strong> "Step 2", prices, ingredients, measurements.</li><li><strong>Captions for silent viewers:</strong> for spoken words, let the editor write them — see <a href="/tutorials/add-subtitles-to-video-automatically/">add subtitles automatically</a>.</li><li><strong>A call to action at the end:</strong> "Follow for part 2" or a <a href="/tutorials/add-subscribe-button-to-video/">subscribe button</a>.</li><li><strong>Your channel name:</strong> small, in a corner — see <a href="/blog/add-logo-watermark-to-video/">add your own logo or watermark</a>.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Is it really free, without a watermark?</h3>
<p>Yes. Reelsmith never adds a watermark or a logo, and you don't need to sign up.</p>
<h3>Can I add text to only part of a video?</h3>
<p>Yes. The text shows only while its clip is on the timeline. Trim the text clip's edges, or press <code>⌘K</code> to split it and delete what you don't need.</p>
<h3>Can I add text to a video in several places at once?</h3>
<p>Yes. Put each one on its own video track (V2, V3 and so on), and position them separately.</p>
<h3>Can I add text to a video on my phone?</h3>
<p>Yes. Open reelsmithapp.com in your phone's browser; the Edit tab holds the same text settings. See <a href="/blog/edit-video-on-phone-in-browser/">editing video on a phone</a>.</p>
<p>Try it now with the <a href="/tools/add-text-to-video/">free text tool</a>, or <a href="/">open the editor</a>.</p>`;

await savePostScript({
  title: 'How to Add Text to a Video Without a Watermark (Free)',
  slug: 'add-text-to-video-without-watermark',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-24T10:00:00+06:00'),
  excerpt: 'Add text to a video without a watermark: type a title, style it, place it where people can read it, animate it and export — free in your browser, no sign-up.',
  metaTitle: 'Add Text to a Video Without a Watermark, Free',
  metaDescription: 'Add text to a video for free with no watermark: type titles and labels, style and animate them, keep them readable and export. In your browser, no upload.',
  focusKeyword: 'add text to a video', synonyms: 'put text on a video, text on video, add a title to a video, video text without watermark',
  keywords: 'add text to video, add text to video without watermark, text on video online free, video title, animated text, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Add text to a video: a two-tone title over a café clip with text settings in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
