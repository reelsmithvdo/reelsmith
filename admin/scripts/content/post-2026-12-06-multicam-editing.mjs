// Blog post, scheduled 2026-12-06 10:00 (Asia/Dhaka): "Multi-Camera Editing for Podcasts and Interviews". Image: src/assets/shots/multicam.jpg
// (scenes-blog.js "multicam"). Steps follow docs multicam (Create Multi-Camera Source Sequence, 1–9 keys, ⇧0, Switch to Camera).
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/multicam.jpg';
const html = `<p>Filmed a podcast, an interview or a performance with two or three cameras? Cutting between the angles by hand takes hours. Multi-camera editing makes it fast: you sync the cameras once, then switch angles live while the video plays, like a TV director. This guide shows the whole workflow in Reelsmith, a free editor that runs in your browser — even big camera files stay on your computer.</p>
${fig(IMG, 'Multi-camera editing: three camera angles of an outdoor podcast in the Multi-Camera view of the Program monitor', 'Three angles of one recording in the Multi-Camera view. The active camera has a yellow outline; click another angle (or press 1–3) to cut to it.')}
<h2>What you need for multi-camera editing</h2>
<ul><li>Two to nine clips that recorded the <strong>same moment</strong> from different angles.</li><li>Sound on each clip (even a camera's built-in microphone), so they can be synced by audio.</li><li>Ideally, one clean audio recording — usually the best microphone — used for the whole edit.</li></ul>
<h2>Step 1: Import the camera clips</h2>
<p>Open <a href="/">the editor</a> and import all camera files. Give them clear names first (for example <em>cam-A-wide</em>, <em>cam-B-host</em>) — it helps later when you choose angles.</p>
<h2>Step 2: Create the multi-camera sequence</h2>
<ol><li>In the Project panel, <code>⌘</code>-click (Ctrl-click on Windows) the camera clips. The first one you select becomes <strong>Camera 1</strong>, and its audio is used.</li><li>Click the <strong>multicam</strong> button (four squares) at the top of the panel, or right-click ▸ <strong>Create Multi-Camera Source Sequence…</strong></li><li>Under <strong>Synchronize by</strong>, choose <strong>Audio</strong> — Reelsmith matches the sound waveforms so the cameras line up. Choose <strong>In points</strong> only if all cameras started at the same moment.</li><li>Keep <strong>Add to the current sequence</strong> ticked and click <strong>Create</strong>.</li></ol>
${tip('Clap once in front of all cameras when you start recording. It gives the audio sync a sharp, easy point to match — the same reason films use a clapperboard.')}
<h2>Step 3: Switch cameras while it plays</h2>
<ol><li>Click <strong>Multi-Camera</strong> in the Program monitor (or press <code>⇧0</code>). You see all angles next to the program picture.</li><li>Press Space to play.</li><li>Press <strong>1</strong>, <strong>2</strong>, <strong>3</strong>… to cut to that camera — or click its picture. A cut is added at that moment, and the active angle is outlined.</li><li>Stop and go back whenever you like; with playback stopped, a number key changes the camera of the section under the playhead.</li></ol>
<p>A good rhythm: show the person who is talking, cut to a listener's reaction now and then, and use the wide shot to reset after a few close-ups.</p>
<h2>Step 4: Fine-tune the cuts</h2>
<ul><li><strong>Move a cut:</strong> use the <strong>Rolling Edit</strong> tool (<code>N</code>) and drag the cut left or right; both sides adjust.</li><li><strong>Change an angle:</strong> right-click a section ▸ <strong>Switch to Camera</strong>, or pick it in <strong>Effect Controls ▸ Multi-Camera</strong>.</li><li><strong>Add titles and graphics</strong> on V2 above the multicam clip, just like in any edit.</li></ul>
<p>All the details are in the <a href="/docs/multicam/">multicam guide</a>.</p>
<h2>Step 5: Choose the sound</h2>
<p>Camera 1's audio is used by default; the other angles' sound starts muted inside the multicam sequence. To use another microphone, open the multicam sequence (double-click it in the Project panel) and unmute that track. If you recorded sound separately, put it on its own audio track and mute the cameras.</p>
<h2>Why editors use multi-camera</h2>
<p>Multi-camera shooting is how TV shows, concerts and sports are covered (<a href="https://en.wikipedia.org/wiki/Multiple-camera_setup" target="_blank" rel="noopener">background on Wikipedia</a>). For YouTube podcasts and interviews it keeps a long conversation lively without the speakers doing anything special — and editing it with live switching takes about as long as watching it once.</p>
<h2>Frequently asked questions</h2>
<h3>The cameras didn't sync. What now?</h3>
<p>Audio sync needs sound on every clip. If one camera had no audio, trim the clips so they start at the same moment (for example at the clap) and choose <strong>In points</strong> instead.</p>
<h3>How many cameras can I use?</h3>
<p>Up to nine angles in one multi-camera sequence.</p>
<h3>Can I turn a multicam podcast into Shorts?</h3>
<p>Yes. Mark the best moments and follow <a href="/blog/turn-long-video-into-shorts/">how to turn a long video into Shorts</a>.</p>
<h3>Are my camera files uploaded?</h3>
<p>No. Syncing, switching and exporting all happen on your own computer.</p>
<p>Ready? <a href="/">Open the editor</a> and cut your first multi-camera edit.</p>`;

await savePostScript({
  title: 'Multi-Camera Editing for Podcasts and Interviews (Free)',
  slug: 'multi-camera-editing-podcasts-interviews',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-06T10:00:00+06:00'),
  excerpt: 'Multi-camera editing made simple: sync two to nine cameras by audio, then switch angles live while the video plays — free in your browser, with your files never uploaded.',
  metaTitle: 'Multi-Camera Editing for Podcasts (Free)',
  metaDescription: 'Multi-camera editing for podcasts and interviews: sync up to nine cameras by audio and switch angles live while it plays — free in your browser, no upload.',
  focusKeyword: 'multi-camera editing', synonyms: 'multicam editing, multicam, switch camera angles, podcast editing, interview editing',
  keywords: 'multi camera editing, multicam, podcast video editing, interview, sync cameras by audio, switch angles, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Multi-camera editing: three podcast camera angles in the Multi-Camera view of the Program monitor' },
  contentHtml: html, order: 99,
});
process.exit(0);
