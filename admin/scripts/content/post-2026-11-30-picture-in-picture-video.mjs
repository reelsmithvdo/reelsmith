// Blog post, scheduled 2026-11-30 10:00 (Asia/Dhaka): "How to Make a Picture-in-Picture Video". Image: src/assets/shots/pip.jpg
// (scenes-blog.js "pip"). Features: Effects ▸ Blur & Motion ▸ Picture in Picture (scale 35%, corner), Drop Shadow, Crop, Ellipse mask.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/pip.jpg';
const html = `<p>Reaction videos, tutorials, game commentary and product reviews all use the same trick: a small video of you in the corner of the main video. This guide shows how to make a picture-in-picture video in a few clicks, then how to give the small window a shadow, a round shape or an entrance animation. It's free in Reelsmith, an editor that runs in your browser — no upload, no watermark.</p>
${fig(IMG, 'Make a picture-in-picture video: a face-cam clip on V2 scaled to 35% in the corner of a street-food video', 'The face-cam on V2 after Picture in Picture: 35% in the bottom-right corner, with a Drop Shadow. Position and Scale are in Effect Controls ▸ Motion.')}
<h2>How a picture-in-picture video works</h2>
<p>The timeline stacks video tracks like layers. Whatever is on <strong>V2</strong> appears on top of <strong>V1</strong>. So you put the main video on V1, the smaller video on V2, and make the V2 clip small. That's all picture-in-picture is (<a href="https://en.wikipedia.org/wiki/Picture-in-picture" target="_blank" rel="noopener">the idea comes from TV sets</a>).</p>
<h2>Step 1: Put both videos on the timeline</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>. Select the main video and the face-cam (or second) video.</li><li>Drag the main video onto <strong>V1</strong>.</li><li>Drag the face-cam video onto <strong>V2</strong>, directly above it.</li></ol>
<p>If both were recorded at the same time, line them up: play both, find a clap or a clear word, and slide the V2 clip until the waveforms match.</p>
<h2>Step 2: Make the picture-in-picture</h2>
<p>Drag <strong>Effects ▸ Blur &amp; Motion ▸ Picture in Picture</strong> onto the V2 clip. It shrinks the clip to 35% and moves it to the bottom-right corner.</p>
<p>To change it, select the clip and use <strong>Effect Controls ▸ Motion</strong> — <strong>Scale</strong> for the size and <strong>Position X/Y</strong> for the place. Even quicker: drag the small window in the Program monitor, and drag a corner to resize it. It snaps to the centre and the edges; hold Shift to move it freely.</p>
${tip('Leave a little space between the window and the frame edge. Phones and TVs can cut off the outer edge of the picture, so press Safe in the Program monitor to see the safe area.')}
<h2>Step 3: Make it look polished</h2>
<ul><li><strong>Shadow:</strong> drag <strong>Effects ▸ Video Effects ▸ Drop Shadow</strong> onto the small clip. It lifts the window off the background. Set the distance and softness in Effect Controls.</li><li><strong>Tighter framing:</strong> add <strong>Crop</strong> to trim empty wall or desk from the sides of the face-cam.</li><li><strong>Round window:</strong> in <strong>Effect Controls ▸ Opacity ▸ Masks</strong>, click <strong>Ellipse</strong> and fit it around your face. Everything outside disappears, so the window becomes a circle.</li><li><strong>Entrance:</strong> drag <strong>Animations — In ▸ Pop</strong> or <strong>Slide</strong> onto the clip so the window appears with a little motion. See <a href="/docs/animations/">Clip and text animations</a>.</li></ul>
<h2>Step 4: Choose which sound you hear</h2>
<p>Both clips can bring their own sound. Usually you want your voice from the face-cam and the main video quieter. Select the main video's audio and lower its <strong>Volume</strong> in Effect Controls, or mute its track with <strong>M</strong>. For music under speech, see <a href="/blog/add-music-to-video-without-drowning-voice/">how to add music without drowning out your voice</a>.</p>
<h2>Picture-in-picture ideas</h2>
<ul><li><strong>Reaction videos:</strong> your face in the corner, the clip you react to full-screen.</li><li><strong>Tutorials:</strong> a screen recording on V1 and you explaining on V2.</li><li><strong>Before and after:</strong> the original as a small window over the edited version.</li><li><strong>Two people:</strong> two windows on V2 and V3, one in each lower corner.</li></ul>
<p>For two videos side by side at the same size, a split screen works better — the steps are in <a href="/docs/video-effects/">Crop, Transform and Drop Shadow</a>.</p>
<h2>Frequently asked questions</h2>
<h3>Why can't I see the small video?</h3>
<p>It is probably on V1 under the main video. Drag it up to V2, or check that V2's eye button is on.</p>
<h3>Can the small window move during the video?</h3>
<p>Yes. Click the stopwatch next to Position, move the playhead, then drag the window — a keyframe is added automatically. See <a href="/docs/effect-controls/">Effect Controls and keyframes</a>.</p>
<h3>Does it work for vertical videos?</h3>
<p>Yes. In a 9:16 sequence the same steps place the window inside the vertical frame.</p>
<h3>Are my videos uploaded?</h3>
<p>No. Both videos stay on your computer, from import to export.</p>
<p>Ready? <a href="/">Open the editor</a> and make your first picture-in-picture video.</p>`;

await savePostScript({
  title: 'How to Make a Picture-in-Picture Video (Free and Easy)',
  slug: 'how-to-make-a-picture-in-picture-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-30T10:00:00+06:00'),
  excerpt: 'Make a picture-in-picture video for reactions, tutorials and reviews: a small face-cam in the corner, with a shadow, a round shape or an animation — free in your browser.',
  metaTitle: 'How to Make a Picture-in-Picture Video (Free)',
  metaDescription: 'Make a picture-in-picture video in a few clicks: a small face-cam in the corner with a shadow, round shape or animation — free in your browser, no upload.',
  focusKeyword: 'picture-in-picture video', synonyms: 'picture in picture, PIP video, face cam overlay, video in video, reaction video',
  keywords: 'picture in picture video, pip, face cam, reaction video, video overlay, drop shadow, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Picture-in-picture video: face-cam on V2 scaled into the corner of a street-food clip' },
  contentHtml: html, order: 99,
});
process.exit(0);
