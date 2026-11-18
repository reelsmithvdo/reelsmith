// Blog post, scheduled 2026-12-14 10:00 (Asia/Dhaka): "How to Make a Freeze Frame Effect". Image: src/assets/shots/freeze.jpg
// (scenes-blog.js "freeze"). Features: Add Frame Hold / Insert Frame Hold Segment (docs time-tools), Lower Third title, Zoom Punch, sfx.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/freeze.jpg';
const html = `<p>The video stops mid-jump, a name pops up — "Yep, that's me." The freeze frame is one of the oldest tricks in film and still one of the most fun. This guide shows how to make a freeze frame effect in a video, add a name or a joke over it, and continue playing. It's quick and free in Reelsmith, an editor that runs in your browser, with nothing uploaded.</p>
${fig(IMG, 'Make a freeze frame effect: Frame Hold on a surfing clip with a Lower Third name title over the frozen picture', 'Frame Hold on the surfing clip at 4 seconds, with a Lower Third title over the still. The held part shows "Hold" on the timeline.')}
<h2>Two kinds of freeze frame</h2>
<ul><li><strong>Freeze and continue:</strong> the action stops for a moment, then plays on. Perfect for introducing a person.</li><li><strong>Freeze to the end:</strong> the clip stops on its last moment, often under the final title (<a href="https://en.wikipedia.org/wiki/Freeze_frame_shot" target="_blank" rel="noopener">a classic film ending</a>).</li></ul>
<h2>Step 1: Find the perfect frame</h2>
<p>Open <a href="/">the editor</a>, import your clip and drag it onto the timeline. Play to the moment and step frame by frame with <code>←</code> and <code>→</code>. Pick a frame where the person is sharp, the face is visible and the pose says something — mid-air, mid-laugh, mid-splash.</p>
<h2>Step 2a: Freeze and continue</h2>
<p>With the playhead on that frame, choose <strong>Clip ▸ Insert Frame Hold Segment</strong>. A two-second still of that frame is inserted at the playhead, and everything after it moves later — so the video freezes, then carries on where it stopped. Drag the end of the still to make it longer or shorter.</p>
<h2>Step 2b: Freeze to the end</h2>
<p>Right-click the clip ▸ <strong>Add Frame Hold</strong> (or <strong>Effect Controls ▸ Time ▸ Frame Hold</strong>). From the playhead to the end of the clip, the picture becomes a still of that frame. The held part is marked <strong>Hold</strong> on the timeline. Both options are explained in <a href="/docs/time-tools/">Freeze frames, reverse and speed ramps</a>.</p>
<h2>Step 3: Add a name or a caption</h2>
<ol><li>Put the playhead on the frozen part.</li><li>Open <strong>Effects ▸ Title Templates</strong> and double-click <strong>Lower Third</strong>. It appears on V2 at the playhead.</li><li>Double-click the text in the Program monitor and type, for example, the person's name and a short line about them.</li><li>Drag the title clip so it covers the freeze.</li></ol>
<p>For a funny tone, try <strong>Meme Top Text</strong> or the <strong>Comic</strong> text style. More about titles in <a href="/tutorials/animated-text-titles/">how to make animated text</a>.</p>
${tip('Freeze frames feel stronger with sound. Add a record-scratch, whoosh or camera-shutter sound from Effects ▸ Sound Effects exactly where the picture stops, and let the music pause or drop for that moment.')}
<h2>Step 4: Make the still stand out</h2>
<ul><li><strong>Zoom in:</strong> drag <strong>Effects ▸ Creative Effects ▸ Zoom Punch</strong> onto the frozen part for a quick punch-in.</li><li><strong>Change the colour:</strong> drag <strong>Black &amp; White</strong> or <strong>Effects ▸ Filters ▸ Noir</strong> onto the still, so the freeze looks like a photograph.</li><li><strong>Slow into it:</strong> a short speed ramp into the freeze (100% → 30% just before it) feels cinematic — see <a href="/blog/how-to-make-a-speed-ramp/">how to make a speed ramp</a>.</li></ul>
<h2>Where freeze frames work best</h2>
<ul><li>Introducing friends in a travel video or vlog.</li><li>"Wait for it" moments in Shorts and Reels.</li><li>Sports highlights: freeze on the decisive moment, then replay it.</li><li>The last shot of a video, under the end title.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I remove a frame hold?</h3>
<p>Yes. Right-click the held part ▸ <strong>Remove Frame Hold</strong>, or click the Frame Hold button in Effect Controls ▸ Time again.</p>
<h3>Why is my frozen frame blurry?</h3>
<p>The frame you chose has motion blur. Step a frame or two forward or back to find a sharper one.</p>
<h3>Can I export just the frozen frame as a picture?</h3>
<p>The freeze stays part of your video. To share the moment as an animation, try <a href="/blog/turn-video-into-gif/">turning the video into a GIF</a>.</p>
<h3>Is my video uploaded?</h3>
<p>No. Everything happens in your browser, on your device.</p>
<p>Ready? <a href="/">Open the editor</a> and freeze your favourite moment.</p>`;

await savePostScript({
  title: 'How to Make a Freeze Frame Effect (with a Name Title)',
  slug: 'how-to-make-a-freeze-frame-effect',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-14T10:00:00+06:00'),
  excerpt: 'Make a freeze frame effect: stop the video on the perfect frame, add a name or a joke over it, then let it play on — free in your browser, with nothing uploaded.',
  metaTitle: 'How to Make a Freeze Frame Effect (Free)',
  metaDescription: 'Make a freeze frame effect: hold the perfect frame, add a name title or a joke, add a sound and continue playing — free in your browser, nothing uploaded.',
  focusKeyword: 'freeze frame effect', synonyms: 'freeze frame, frame hold, pause a video on one frame, still frame, introduce a person',
  keywords: 'freeze frame effect, frame hold, freeze frame with name, still frame, lower third, vlog intro, free video editor',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Freeze frame effect: Frame Hold on a surfing clip with a lower-third name title' },
  contentHtml: html, order: 99,
});
process.exit(0);
