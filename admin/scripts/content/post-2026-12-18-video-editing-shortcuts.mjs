// Blog post, scheduled 2026-12-18 10:00 (Asia/Dhaka): "Video Editing Keyboard Shortcuts". Image: src/assets/shots/shortcuts.jpg
// (scenes-blog.js "shortcuts"). Every shortcut here is from help-content.js "shortcuts" (Help ▸ Keyboard Shortcuts, ⌘/).
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/shortcuts.jpg';
const html = `<p>Professional editors barely touch the mouse. A dozen video editing shortcuts are enough to cut twice as fast: play and scrub with three keys, cut with one, close gaps with another. This guide lists the shortcuts that matter most, grouped by what you're doing, and a simple routine to learn them. They work in Reelsmith, a free editor that runs in your browser, and most also follow the conventions of the big desktop editors.</p>
${fig(IMG, 'Video editing shortcuts: the Keyboard Shortcuts list in Reelsmith Help over a concert edit with many cuts', 'Help ▸ Keyboard Shortcuts (⌘/) over a concert edit. The full list is always one key away.')}
<p>On Windows and Linux, use <strong>Ctrl</strong> where this guide shows <strong>⌘</strong>, and <strong>Alt</strong> for <strong>⌥</strong>.</p>
<h2>Playback: J, K, L and friends</h2>
<ul><li><code>Space</code> — play / pause.</li><li><code>J</code> <code>K</code> <code>L</code> — play backwards, stop, play forwards. Press <code>L</code> again to go faster. Rest three fingers on these keys and you'll rarely need the mouse.</li><li><code>←</code> <code>→</code> — one frame back or forward (with <code>Shift</code>, five frames).</li><li><code>↑</code> <code>↓</code> — jump to the previous or next edit point.</li><li><code>Home</code> / <code>End</code> — start or end of the sequence.</li></ul>
<h2>Cutting: the shortcuts you'll use most</h2>
<ul><li><code>⌘K</code> — split the clip under the playhead (or the selected clips). <code>⇧⌘K</code> splits every track.</li><li><code>C</code> — Razor tool: click a clip to cut it. <code>V</code> brings back the Selection tool.</li><li><code>⇧Delete</code> — Ripple Delete: remove a clip and close the gap.</li><li><code>Q</code> / <code>W</code> — ripple trim the previous / next edit to the playhead. Put the playhead where a clip should start (Q) or end (W), press the key, done.</li></ul>
${tip('The fastest rough cut: play with L, press K at a mistake, mark the bad part with ⌘K at both ends, then ⇧Delete. Repeat. Q and W make it even faster.')}
<h2>Selecting, moving and fixing</h2>
<ul><li><code>⌘Z</code> / <code>⇧⌘Z</code> — undo / redo.</li><li><code>⌘C</code> <code>⌘X</code> <code>⌘V</code> — copy, cut, paste at the playhead.</li><li><code>⌘L</code> — link / unlink video and audio.</li><li><code>⇧E</code> — enable / disable a clip (hide it without deleting).</li><li><code>⌘R</code> — Speed/Duration.</li><li><code>S</code> — snapping on/off.</li><li><code>⌥←</code> / <code>⌥→</code> — nudge a clip by a frame.</li><li><code>Esc</code> — deselect.</li></ul>
<h2>Trimming tools</h2>
<ul><li><code>B</code> — Ripple Edit: trim a clip and move everything after it.</li><li><code>N</code> — Rolling Edit: move a cut between two clips.</li><li><code>R</code> — Rate Stretch: change speed by dragging a clip's end.</li><li><code>Y</code> — Slip: change which part of a clip plays, without moving it.</li><li><code>U</code> — Slide: move a clip between its neighbours.</li></ul>
<p>Each tool is explained in <a href="/docs/tools/">The Tools strip</a>.</p>
<h2>Markers, In and Out</h2>
<ul><li><code>M</code> — add a marker (press again to name it).</li><li><code>I</code> / <code>O</code> — set In / Out points; <code>⌥X</code> clears them.</li><li><code>;</code> lift and <code>'</code> extract — remove the In/Out range, leaving a gap or closing it.</li></ul>
<h2>Titles, transitions and audio</h2>
<ul><li><code>T</code> — Type tool; <code>⌘T</code> — new title.</li><li><code>⌘D</code> — video transition; <code>⇧⌘D</code> — audio crossfade.</li><li><code>G</code> — audio gain.</li></ul>
<h2>View and project</h2>
<ul><li><code>=</code> / <code>-</code> — zoom the timeline in / out; <code>\\</code> — fit the whole sequence.</li><li><code>⌘S</code> — save; <code>⌘I</code> — import; <code>⌘M</code> — export.</li><li><code>⌘/</code> — show all shortcuts; <code>F1</code> — Help.</li></ul>
<p>The complete list is in <a href="/docs/shortcuts/">Keyboard shortcuts</a>.</p>
<h2>How to learn them in a week</h2>
<ol><li><strong>Day 1–2:</strong> Space, J K L and the arrow keys. Stop using the mouse to move the playhead.</li><li><strong>Day 3–4:</strong> ⌘K, ⇧Delete and ⌘Z. Cut a whole video with them.</li><li><strong>Day 5–6:</strong> Q, W and C. Your rough cuts get much faster.</li><li><strong>Day 7:</strong> I, O, M and ⌘D.</li></ol>
<p>Shortcuts are the reason <a href="https://en.wikipedia.org/wiki/Non-linear_editing" target="_blank" rel="noopener">non-linear editors</a> feel so fast in experienced hands — and they transfer: most of these keys work the same way in other editors.</p>
<h2>Frequently asked questions</h2>
<h3>Why does a shortcut type into a box instead?</h3>
<p>A text field has focus. Press <code>Esc</code> or click on the timeline, then try again.</p>
<h3>Do the shortcuts work in every browser?</h3>
<p>Yes — in Chrome, Edge, Safari and Firefox, on Mac, Windows and Linux.</p>
<h3>Can I use the editor without a keyboard?</h3>
<p>Yes. Every action is also in the menus and the right-click menu, and on tablets and phones by touch — see <a href="/docs/workspace/">The workspace</a>.</p>
<p>Ready? <a href="/">Open the editor</a> and press <code>⌘/</code> to keep the list at hand.</p>`;

await savePostScript({
  title: 'Video Editing Shortcuts That Make You Twice as Fast',
  slug: 'video-editing-keyboard-shortcuts',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-18T10:00:00+06:00'),
  excerpt: 'The video editing shortcuts that matter most — J K L playback, ⌘K, ripple delete, Q and W, trimming tools and more — grouped by task, with a one-week plan to learn them.',
  metaTitle: 'Video Editing Shortcuts to Edit Twice as Fast',
  metaDescription: 'Learn the video editing shortcuts that matter: J K L playback, split, ripple delete, Q and W trims, markers and more, plus a one-week plan to learn them.',
  focusKeyword: 'video editing shortcuts', synonyms: 'keyboard shortcuts, editing shortcuts, J K L, hotkeys, edit faster',
  keywords: 'video editing shortcuts, keyboard shortcuts, jkl editing, ripple delete, razor tool, edit faster, free video editor',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Video editing shortcuts: the Keyboard Shortcuts help page over a concert edit in Reelsmith' },
  contentHtml: html, order: 99,
});
process.exit(0);
