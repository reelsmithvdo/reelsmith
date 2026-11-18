// Blog post, scheduled 2026-11-26 10:00 (Asia/Dhaka): "How to Make a Speed Ramp". Image: src/assets/shots/speedramp.jpg
// (scenes-blog.js "speedramp"). Features: Effect Controls ▸ Time (Speed presets, Time Remap Speed keyframes, TR badge), ⌘R, R tool.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/speedramp.jpg';
const html = `<p>A speed ramp is the move you see in every skate, sports and travel edit: the clip plays at normal speed, slows down right at the best moment, then snaps back. This guide shows how to make a speed ramp step by step with keyframes, and how to make simple slow motion and fast motion too. Everything works for free in Reelsmith, an editor that runs in your browser, with nothing uploaded.</p>
${fig(IMG, 'Make a speed ramp: Time Remap Speed keyframes going from 100% to 25% and back on a skateboarding clip', 'Time Remap Speed keyframes on the kickflip: 100% → 25% for the trick → back to 100%. The clip shows TR on the timeline.')}
<h2>Speed ramp, slow motion or fast motion?</h2>
<ul><li><strong>Constant slow or fast motion</strong> changes the speed of a whole clip, for example 50% or 200%.</li><li><strong>A speed ramp</strong> changes the speed gradually inside one clip, using keyframes. That's what makes it feel dynamic.</li></ul>
<p>Both are in <strong>Effect Controls ▸ Time</strong>. Let's start with the simple one.</p>
<h2>Constant slow motion or fast motion</h2>
<ol><li>Open <a href="/">the editor</a>, import your clip and drag it onto the timeline.</li><li>Select the clip and open <strong>Effect Controls ▸ Time</strong>.</li><li>Click a preset — <strong>25%</strong>, <strong>50%</strong>, <strong>200%</strong> or <strong>400%</strong> — or type any value into <strong>Speed</strong>.</li></ol>
<p>Alternatively, press <code>⌘R</code> (Ctrl+R on Windows) for <strong>Speed/Duration</strong>, where you can type a speed or a new length. Tick <strong>Ripple Edit, Shifting Trailing Clips</strong> there so later clips move along. Or use the <strong>Rate Stretch</strong> tool (<code>R</code>) and simply drag the clip's end: longer means slower. More in <a href="/tools/speed-up-video/">speed up a video</a>.</p>
<h2>How to make a speed ramp with keyframes</h2>
<ol><li>Find the moment you want to slow down — the jump, the splash, the goal — and note where it starts and ends.</li><li>Select the clip. In <strong>Effect Controls ▸ Time</strong>, move the playhead a little before the moment and click the stopwatch next to <strong>Time Remap Speed</strong>. This adds a keyframe at 100%.</li><li>Move the playhead to where the action begins and set <strong>Time Remap Speed</strong> to 25–40%. A second keyframe appears.</li><li>Move to where the action ends and add a keyframe with the same slow value, using the ◆ button.</li><li>Move a little further and set the value back to 100% (or higher, for example 300%, for a fast exit).</li></ol>
<p>The clip now shows <strong>TR</strong> on the timeline and the keyframes as small diamonds. Press Space to watch it. If the change feels abrupt, move the keyframes further apart; the ramp then takes longer. The details are in the <a href="/docs/time-tools/">time tools guide</a>.</p>
${tip('Put the slowest part exactly on the peak of the action — the top of the jump, the moment the ball leaves the foot. Ramp down just before it, not during it.')}
<h2>Tips for smooth slow motion</h2>
<ul><li><strong>Film at a higher frame rate.</strong> Footage shot at 60 or 120 frames per second has more real frames to stretch, so slow motion stays fluid. Normal 30 fps footage at 25% shows each frame four times and can look choppy (<a href="https://en.wikipedia.org/wiki/Slow_motion" target="_blank" rel="noopener">why, on Wikipedia</a>).</li><li><strong>Keep the slow part short.</strong> One to three seconds of slow motion has the most impact.</li><li><strong>Cut on the music.</strong> Put the ramp on a beat or a drop. The waveform on the audio track shows where the beats are.</li><li><strong>Mute or replace the sound.</strong> Slowed sound rarely sounds good. Unlink with <code>⌘L</code> and delete the clip's own audio, or let the music carry the moment.</li></ul>
<h2>Other time effects</h2>
<ul><li><strong>Reverse:</strong> <strong>Effect Controls ▸ Time ▸ Reverse</strong> plays the clip backwards — fun for a rewind moment. See <a href="/tools/reverse-video/">reverse a video</a>.</li><li><strong>Freeze frame:</strong> <strong>Frame Hold</strong> stops the picture on one frame, for example to introduce a person.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Why doesn't my speed ramp show up?</h3>
<p>Time Remap needs at least two keyframes with different values. Check that the stopwatch is on (orange) and that the diamonds sit inside the clip.</p>
<h3>How do I remove a speed ramp?</h3>
<p>Click the stopwatch next to Time Remap Speed again. The keyframes are removed and the clip keeps a single speed.</p>
<h3>Can I ramp the audio too?</h3>
<p>Speed changes apply to the clip's linked sound as well. For most edits, though, music on its own track sounds better.</p>
<h3>Is my video uploaded?</h3>
<p>No. Editing and exporting happen in your browser, on your own device.</p>
<p>Ready? <a href="/">Open the editor</a> and try a ramp on your best clip.</p>`;

await savePostScript({
  title: 'How to Make a Speed Ramp (Smooth Slow Motion, Free)',
  slug: 'how-to-make-a-speed-ramp',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-26T10:00:00+06:00'),
  excerpt: 'Make a speed ramp that slows down at the best moment and snaps back: Time Remap keyframes, plus simple slow and fast motion — free in your browser.',
  metaTitle: 'How to Make a Speed Ramp (Free Slow Motion)',
  metaDescription: 'Make a speed ramp step by step: Time Remap keyframes that slow the action down and speed it back up, plus slow and fast motion — free in your browser.',
  focusKeyword: 'speed ramp', synonyms: 'slow motion, time remapping, speed ramping, fast motion, slow down a video',
  keywords: 'speed ramp, slow motion video, time remapping, speed ramping, fast motion, keyframes, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Speed ramp with Time Remap Speed keyframes at 25% on a skateboarding clip in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
