// Blog post, scheduled 2026-12-30 10:00 (Asia/Dhaka): "How to Reverse a Video". Topic from Search Console
// ("reverse video online"). Image: src/assets/shots/reverse.jpg (scenes-blog2.js "reverse").
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/reverse.jpg';
const html = `<p>Water flowing uphill, a jump that lands back where it started, a cup that fills itself — playing a clip backwards is one of the oldest tricks in film, and it still stops people from scrolling. This guide shows how to reverse a video in one click, and how to build the three popular effects on top of it: the rewind, the boomerang and the slow-motion reverse. You can do it for free in Reelsmith, an editor that runs in your browser, so your video is never uploaded.</p>
${fig(IMG, 'Reverse a video: the second copy of a clip reversed on the timeline, with Reverse switched on in Effect Controls ▸ Time', 'A rewind edit: the jump plays forwards, then a reversed copy (marked ◀◀) with a whoosh on the cut.')}
<h2>Step 1: Import the clip</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>, or drag the file onto the window.</li><li>Drag the clip onto the timeline.</li><li>Trim it to the moment you want to reverse — usually just a few seconds. Shorter reversed clips look more surprising.</li></ol>
<h2>Step 2: Reverse the video</h2>
<p>Select the clip and use any of these — they do the same thing:</p>
<ul><li>Right-click the clip ▸ <strong>Reverse Clip</strong>.</li><li>Choose <strong>Clip ▸ Reverse Clip</strong> in the menu bar.</li><li>Click <strong>◀◀ Reverse</strong> in <strong>Effect Controls ▸ Time</strong>.</li></ul>
<p>A small ◀◀ mark appears on the clip. Press Space to play it. The preview steps through the frames backwards, so it may look a little less smooth than normal playback; the exported video is smooth and frame-accurate. To undo it, choose <strong>Un-reverse Clip</strong> from the same menu. More in <a href="/docs/time-tools/">Freeze frames, reverse and speed ramps</a>.</p>
${tip('Reverse only part of a clip: move the playhead to where the reverse should start, press ⌘K (Ctrl+K) to split, and reverse just that piece.')}
<h2>The rewind effect</h2>
<p>The classic: something happens, then "rewinds" as if someone pressed a button.</p>
<ol><li>Select the clip and choose <strong>Edit ▸ Duplicate</strong>. A copy appears right after it.</li><li>Reverse the copy.</li><li>Add a whoosh on the cut: drag <strong>Whoosh</strong> from <strong>Effects ▸ Sound Effects</strong> onto an audio track, just before the second clip starts.</li></ol>
<p>For an even stronger rewind, speed up the reversed copy: select it and click <strong>200%</strong> or <strong>400%</strong> in <strong>Effect Controls ▸ Time</strong>.</p>
<h2>The boomerang effect</h2>
<p>A boomerang plays a very short moment forwards, backwards, forwards again — like a loop that bounces. It works best with one simple movement: a toast, a jump, a hair flip, a wave.</p>
<ol><li>Trim the clip to one or two seconds.</li><li>Duplicate it twice, so you have three copies in a row.</li><li>Reverse the middle copy.</li><li>Optionally, speed all three up to 200% for that snappy feel.</li></ol>
<h2>The slow-motion reverse</h2>
<p>In addition, reversed movement looks dreamlike when it's slow — falling leaves rising, a splash pulling back into a glass. Reverse the clip, then click <strong>50%</strong> or <strong>25%</strong> in <strong>Effect Controls ▸ Time</strong>. Footage shot at 60 fps or more stays smoother when slowed down. To change speed gradually instead, see <a href="/blog/how-to-make-a-speed-ramp/">how to make a speed ramp</a>.</p>
<h2>What about the sound?</h2>
<p>Reversed speech sounds strange — which can be funny, but usually isn't what you want. You have three options:</p>
<ul><li><strong>Keep it:</strong> the reversed sound is rendered into the export.</li><li><strong>Remove it:</strong> unlink with <code>⌘L</code> and delete the audio — see <a href="/blog/how-to-remove-audio-from-a-video/">how to remove audio from a video</a>.</li><li><strong>Replace it:</strong> add music and a whoosh or <strong>Record Scratch</strong> from <strong>Effects ▸ Sound Effects</strong> on the cut.</li></ul>
<h2>Ideas for reversed clips</h2>
<p>Reverse motion has been used since the early days of cinema for comedy and "magic" (<a href="https://en.wikipedia.org/wiki/Reverse_motion" target="_blank" rel="noopener">background on Wikipedia</a>). A few that still work well:</p>
<ul><li><strong>Food:</strong> a sauce pouring back into the jug, a cake "un-slicing".</li><li><strong>Sport:</strong> a dive coming out of the water, a ball flying back into the hand.</li><li><strong>Tidying up:</strong> film yourself messing up a room, then reverse it — the room cleans itself.</li><li><strong>Intros:</strong> start the video with a reversed shot that ends on your title; see <a href="/blog/how-to-make-a-video-intro/">how to make a video intro</a>.</li><li><strong>Freeze, then rewind:</strong> stop on a frame, then play it backwards — combine with a <a href="/blog/how-to-make-a-freeze-frame-effect/">freeze frame</a>.</li></ul>
<h2>Step 3: Export the video you reversed</h2>
<p>Click <strong>Export</strong> and choose a preset — <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> for vertical clips, or <strong>Match Source – High bitrate</strong> to keep the original size and quality. The file is an MP4 without a watermark. For a short loop to share in chats, use <strong>File ▸ Export as GIF…</strong> instead; see <a href="/blog/turn-video-into-gif/">how to turn a video into a GIF</a>.</p>
<h2>Frequently asked questions</h2>
<h3>Can I reverse a video on my phone?</h3>
<p>Yes. Open reelsmithapp.com in your phone's browser, import the clip, long-press it and choose <strong>Reverse Clip</strong>.</p>
<h3>Does reversing reduce the quality?</h3>
<p>No more than any export. Choose <strong>Match Source – High bitrate</strong> to keep it sharp.</p>
<h3>Can I reverse a video that is long?</h3>
<p>Yes, but reversed playback is heavier than normal playback, so long clips preview more slowly. The export is not affected.</p>
<h3>Is my video uploaded?</h3>
<p>No. The video is reversed and exported on your device.</p>
<p>Ready? Open the <a href="/tools/reverse-video/">free tool page</a>, or <a href="/">open the editor</a>.</p>`;

await savePostScript({
  title: 'How to Reverse a Video (Rewind, Boomerang and Slow-Mo Reverse)',
  slug: 'how-to-reverse-a-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-30T10:00:00+06:00'),
  excerpt: 'Reverse a video in one click, then make a rewind, a boomerang or a slow-motion reverse, and decide what to do with the sound — free in your browser.',
  metaTitle: 'How to Reverse a Video Online, Free',
  metaDescription: 'Reverse a video online for free: play a clip backwards in one click, then make a rewind, boomerang or slow-motion reverse. No upload, no watermark.',
  focusKeyword: 'reverse a video', synonyms: 'play a video backwards, reverse video online, rewind effect, boomerang video',
  keywords: 'reverse video, reverse video online, play video backwards, rewind effect, boomerang, slow motion reverse, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Reverse a video: a reversed copy of a clip on the timeline with Reverse on in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
