// Blog post, scheduled 2026-11-18 10:00 (Asia/Dhaka): "How to Turn a Video into a GIF". Image: src/assets/shots/gif.jpg
// (scripts/shots/scenes.js "gif"). Options follow quicktools.js gifDialog().
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/gif.jpg';
const html = `<p>A GIF is the easiest way to share a reaction, a quick how-to or a product demo: it plays on its own, loops forever and works almost everywhere. This guide shows how to turn a video into a GIF in a few clicks — pick the moment, choose the size and frame rate, and export. You can do it for free in Reelsmith, an editor that runs in your browser, so your video is never uploaded.</p>
<p>In addition, you'll learn how to keep the file small and sharp, because GIFs grow large quickly if you aren't careful.</p>
${fig(IMG, 'Turn a video into a GIF: the Export as GIF dialog with an In/Out range, 480 px wide and 15 fps', 'File ▸ Export as GIF… with a four-second In/Out range: 480×270, 60 frames.')}
<h2>When a GIF is better than a video</h2>
<ul><li><strong>Short loops:</strong> reactions, a funny moment, a logo animation.</li><li><strong>Quick demos:</strong> a click in an app, a before-and-after, a cooking step.</li><li><strong>Places without video:</strong> some documentation tools, forums and email newsletters show GIFs but not video players.</li></ul>
<p>However, for anything longer than about 20 seconds, or anything that needs sound, an MP4 is the better choice — it is much smaller and keeps the audio.</p>
<h2>Step 1: Import the video</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>, or drag the file onto the window.</li><li>Drag the clip onto the timeline. Any format your browser can play works, including MP4, MOV and WebM.</li></ol>
<h2>Step 2: Mark the part you want to turn into a GIF</h2>
<ol><li>Play the video and stop just before the moment starts.</li><li>Press <code>I</code> to set the In point, play to the end of the moment, then press <code>O</code> to set the Out point.</li><li>Then keep it short: two to six seconds is ideal for a loop.</li></ol>
<p>More about In and Out points: <a href="/docs/markers-inout/">Markers and In/Out</a>. Alternatively, cut the clip itself — see <a href="/tools/trim-video/">trim a video</a>.</p>
${tip('A loop feels smoother when the last frame looks like the first. Move the Out point a frame or two until the jump disappears.')}
<h2>Step 3: Add text (optional)</h2>
<p>Reaction GIFs often have a caption. Press <code>T</code>, click in the Program monitor and type, then style it in <strong>Effects ▸ Text Styles</strong>. Titles and captions that are visible in the Program monitor are included in the GIF. See <a href="/tutorials/animated-text-titles/">how to make animated text</a> for more.</p>
<h2>Step 4: Export the video as a GIF</h2>
<ol><li>Choose <strong>File ▸ Export as GIF…</strong>.</li><li>Set <strong>Range</strong> to <strong>Sequence In/Out</strong> to use the part you marked (or keep the whole sequence).</li><li>Choose the <strong>Size</strong>: 320, 480, 640 or 800 px wide. The height follows your video's shape.</li><li>Choose the <strong>Frame rate</strong>: 10, 15, 20 or 25 fps.</li><li>Keep <strong>Loop forever</strong> ticked, name the file and click <strong>Export GIF</strong>.</li></ol>
<p>The line under the settings shows the final size, length and number of frames before you export. All of it runs on your own device. See <a href="/docs/export-gif-audio/">Export as GIF and audio</a> for the details.</p>
<h2>How to keep a GIF small and sharp</h2>
<p>The GIF format is old and simple: it stores every frame as an image with at most 256 colours (<a href="https://en.wikipedia.org/wiki/GIF" target="_blank" rel="noopener">background on Wikipedia</a>). Therefore size grows fast with length, size and frame rate. A few rules help:</p>
<ul><li><strong>Shorter is better.</strong> After all, every second adds 10–25 more images.</li><li><strong>480 px wide</strong> is usually plenty for chats and most web pages; use 640 or 800 only where it is shown large.</li><li><strong>15 fps</strong> looks smooth for most motion. For example, a screen recording is often fine at 10 fps.</li><li><strong>Still backgrounds are cheap.</strong> Reelsmith merges frames that don't change, so a tripod shot or a screen demo stays small.</li><li><strong>Avoid big gradients.</strong> Skies and soft lighting show banding with only 256 colours; strong, flat colours look best.</li></ul>
<h2>Turn a video into a GIF for different places</h2>
<ul><li><strong>Chat and social replies:</strong> 480 px, 15 fps, 2–4 seconds.</li><li><strong>Documentation and help pages:</strong> 640 or 800 px, 10 fps, so text in the screen recording stays readable.</li><li><strong>Email newsletters:</strong> 480 px and as short as possible, because many email apps load images slowly.</li></ul>
<h2>Fixing common GIF problems</h2>
<ul><li><strong>The file is too big.</strong> First shorten the range, then choose a smaller width; after that, lower the frame rate. As a result, a 10 MB GIF often drops below 3 MB without looking worse.</li><li><strong>Colours look blotchy.</strong> This happens in gradients such as skies. Instead, pick a moment with flatter colours, or brighten the clip a little in <strong>Lumetri Color</strong> before exporting.</li><li><strong>The motion looks choppy.</strong> Raise the frame rate to 20 or 25 fps for fast movement. On the other hand, keep the GIF short so the extra frames don't make it huge.</li><li><strong>The loop jumps.</strong> Move the In or Out point by a frame or two, or end on a frame that matches the start.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Does a GIF have sound?</h3>
<p>No. The GIF format has no audio. If you need sound, export an MP4 instead — it is also smaller.</p>
<h3>How long can a GIF be?</h3>
<p>There is no fixed limit, but files grow quickly. Above about 20 seconds, Reelsmith suggests an MP4, which is usually much smaller.</p>
<h3>Can I turn a video into a GIF on my phone?</h3>
<p>Yes. Reelsmith works in mobile browsers: import the clip, set In and Out, and choose Export as GIF from the File menu.</p>
<h3>Is my video uploaded when I turn a video into a GIF?</h3>
<p>No. The GIF is made in your browser, and the file is saved straight to your device.</p>
<p>Try it now with the <a href="/tools/video-to-gif/">free video to GIF converter</a>, or <a href="/">open the editor</a>.</p>`;

await savePostScript({
  title: 'How to Turn a Video into a GIF (Free, Small and Sharp)',
  slug: 'turn-video-into-gif',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-18T10:00:00+06:00'),
  excerpt: 'Turn a video into a GIF in a few clicks: mark the moment, pick the size and frame rate, add a caption and export a small, sharp looping GIF — free, in your browser.',
  metaTitle: 'How to Turn a Video into a GIF (Free)',
  metaDescription: 'Turn a video into a GIF for free: mark the moment, choose size and frame rate, add text and export a small, sharp loop in your browser — nothing uploaded.',
  focusKeyword: 'turn a video into a GIF', synonyms: 'video to GIF, make a GIF from a video, GIF maker, convert video to GIF',
  keywords: 'video to gif, make a gif from a video, gif maker, convert mp4 to gif, reaction gif, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Turn a video into a GIF: Export as GIF settings with an In/Out range, 480 px wide and 15 fps' },
  contentHtml: html, order: 99,
});
process.exit(0);
