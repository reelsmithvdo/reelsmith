// Blog post, scheduled 2026-12-02 10:00 (Asia/Dhaka): "How to Add Transitions Between Video Clips". Image: src/assets/shots/transitions.jpg
// (scenes-blog.js "transitions"). Features: docs transitions + creative-transitions, ⌘D, Effect Controls ▸ Transitions.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/transitions.jpg';
const html = `<p>A good transition is one nobody notices; a bad one makes a video look like a slideshow from 2005. This guide shows how to add transitions between video clips, which ones to use when, and how to change their length. You'll also learn when a plain cut is the better choice. Everything works for free in Reelsmith, a video editor in your browser that never uploads your clips.</p>
${fig(IMG, 'Add transitions between video clips: Cross Dissolve and Whip Pan on the cuts of a beach video, with the Video Transitions list', 'Cross Dissolve and Whip Pan on the cuts of a beach edit. The playhead is in the middle of the first dissolve, so both shots blend.')}
<h2>Step 1: Put your clips next to each other</h2>
<p>Open <a href="/">the editor</a>, import your clips and drag them onto <strong>V1</strong> so they touch. A transition between two clips needs them to meet at a cut, with no gap. To close a gap, right-click it ▸ <strong>Ripple Delete Gap</strong>.</p>
<h2>Step 2: Add a transition between video clips</h2>
<ol><li>Open the <strong>Effects</strong> panel and find <strong>Video Transitions</strong>.</li><li>Drag <strong>Cross Dissolve</strong> onto the cut between two clips.</li><li>It plays a short preview automatically. Press Space to watch it again.</li></ol>
<p>The quickest way: put the playhead near a cut and press <code>⌘D</code> (Ctrl+D on Windows). That adds a Cross Dissolve to the nearest edit. With several clips selected, it adds one to both ends of each.</p>
<h2>Step 3: Change the length or the type</h2>
<ul><li>Click the striped box on the cut to select the transition. <strong>Effect Controls</strong> shows its <strong>Type</strong> and <strong>Duration</strong>.</li><li>Right-click it to switch to another transition or set the duration.</li><li>Press <strong>Delete</strong> to remove it.</li></ul>
<p>Half a second to one second suits most transitions. Longer ones feel slow and dreamy; shorter ones feel snappy.</p>
${tip('A transition borrows a few frames from beyond the end of the first clip and before the start of the second. If you trimmed nothing there, Reelsmith holds a frame instead — so trim a little from both clips for the smoothest result.')}
<h2>Which transition should you use?</h2>
<ul><li><strong>Cut (no transition):</strong> the default for most edits. Use it whenever the story continues.</li><li><strong>Cross Dissolve:</strong> time passes, or a calm change of place (<a href="https://en.wikipedia.org/wiki/Dissolve_(filmmaking)" target="_blank" rel="noopener">the classic dissolve</a>).</li><li><strong>Dip to Black / Dip to White:</strong> the end of a chapter, or the start and end of the video.</li><li><strong>Whip Pan, Zoom In and Push:</strong> energy — travel edits, vlogs and sports.</li><li><strong>Glitch, Flash and Film Burn:</strong> music videos and intros; use them sparingly.</li><li><strong>Shape transitions</strong> (Color Bars, Circle Burst and more): playful edits; you can change their colours in Effect Controls.</li></ul>
<p>The full list is in <a href="/docs/transitions/">Transitions</a> and <a href="/docs/creative-transitions/">Fun and shape transitions</a>.</p>
<h2>Transitions on a single clip</h2>
<p>A transition also works on a clip with nothing next to it. Then it goes from or to transparent: Cross Dissolve fades a title in, and Push slides it in from the side. That's an easy way to animate titles and logos.</p>
<h2>Audio transitions</h2>
<p>Sound needs smooth changes too. Drag <strong>Audio Transitions ▸ Constant Power</strong> onto the cut between two audio clips for a crossfade, or press <code>⇧⌘D</code>. See <a href="/docs/audio-transitions/">Audio transitions</a>.</p>
<h2>Five rules for better transitions</h2>
<ol><li>Use a cut unless you have a reason not to.</li><li>Stick to one or two transition types per video.</li><li>Match the music: put fast transitions on the beat.</li><li>Keep them short in short videos — Shorts and Reels need speed.</li><li>Transitions can't fix a bad cut. First get the timing right, then decorate it.</li></ol>
<h2>Frequently asked questions</h2>
<h3>Why does my transition show a frozen frame?</h3>
<p>The clips have no extra footage beyond the cut, so a frame is held. Trim a few frames off both clips at the cut and the transition uses real footage.</p>
<h3>Can I add the same transition to every cut?</h3>
<p>Yes. Select all the clips with <code>⌘A</code> and press <code>⌘D</code>, or right-click ▸ <strong>Apply Default Transitions</strong>.</p>
<h3>Are transitions included in the export?</h3>
<p>Yes, exactly as you see them in the Program monitor.</p>
<p>Ready? <a href="/">Open the editor</a>, or merge your clips first with <a href="/tools/merge-videos/">merge videos</a>.</p>`;

await savePostScript({
  title: 'How to Add Transitions Between Video Clips (and When Not To)',
  slug: 'how-to-add-transitions-between-video-clips',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-02T10:00:00+06:00'),
  excerpt: 'Add transitions between video clips the right way: Cross Dissolve in one shortcut, change the length or type, pick the right transition for the moment — free in your browser.',
  metaTitle: 'How to Add Transitions Between Video Clips',
  metaDescription: 'Add transitions between video clips: Cross Dissolve with one shortcut, change length and type, and pick the right one for each cut — free in your browser.',
  focusKeyword: 'add transitions between video clips', synonyms: 'video transitions, cross dissolve, transition effects, fade between clips',
  keywords: 'video transitions, add transitions, cross dissolve, whip pan, dip to black, transition effects, free video editor',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Add transitions between video clips: Cross Dissolve and Whip Pan on the timeline with the Video Transitions list' },
  contentHtml: html, order: 99,
});
process.exit(0);
