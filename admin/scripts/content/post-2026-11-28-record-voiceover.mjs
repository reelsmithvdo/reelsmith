// Blog post, scheduled 2026-11-28 10:00 (Asia/Dhaka): "How to Record a Voiceover for a Video". Image: src/assets/shots/voiceover.jpg
// (scenes-blog.js "voiceover"). Features: track mic button / Audio Track Mixer (audiotools.js), Normalize Loudness, audio effects, Auto Duck.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/voiceover.jpg';
const html = `<p>A good narration turns a pile of clips into a story. This guide shows how to record a voiceover for a video right on the timeline — while the picture plays, so your words land on the right shots — and how to make it sound clean and clear afterwards. You only need a microphone (even the one in your headphones) and Reelsmith, a free editor that runs in your browser. The recording stays on your computer.</p>
${fig(IMG, 'Record a voiceover for a video: the narration on audio track A2 under travel clips, with the Audio Track Mixer open', 'The narration recorded on A2 while the travel clips played; quiet music on A1. The mic buttons are on each track and in the Audio Track Mixer.')}
<h2>Before you record a voiceover</h2>
<ul><li><strong>Write it down.</strong> Even a rough script stops the "um"s. Read it aloud once; spoken sentences should be short.</li><li><strong>Pick a quiet, soft room.</strong> Curtains, a sofa or a wardrobe full of clothes absorb echo. Bare walls and tiles make it worse.</li><li><strong>Get close to the microphone.</strong> About a hand's width away, a little to the side so your breath doesn't hit it.</li><li><strong>Wear headphones.</strong> Then you hear yourself without the speakers leaking into the recording.</li></ul>
<h2>Step 1: Edit the pictures first</h2>
<p>Open <a href="/">the editor</a>, import your clips and put them in order on <strong>V1</strong>. It's much easier to talk over a finished cut than to cut pictures to fit a narration. Background music can wait until the end.</p>
<h2>Step 2: Record the voiceover on the timeline</h2>
<ol><li>Put the playhead where the narration should start.</li><li>Click the <strong>mic</strong> button on an empty audio track's header (for example <strong>A2</strong>), or in the <strong>Audio Track Mixer</strong>.</li><li>The first time, your browser asks for microphone access: click <strong>Allow</strong>.</li><li>The program plays while you speak, so you can time your words to the pictures. The program's own sound is muted during recording to avoid echo.</li><li>Press <strong>Space</strong> or click the mic again to stop.</li></ol>
<p>The recording appears in the Project panel and on that track, starting at the playhead. See <a href="/docs/voiceover/">Recording a voice-over</a>.</p>
${tip('Record in short parts — one paragraph or one scene at a time. A mistake then costs ten seconds, not the whole take.')}
<h2>Step 3: Clean up the takes</h2>
<ul><li><strong>Remove mistakes:</strong> press <code>C</code> for the razor, cut before and after the bad part, select it and press <strong>⇧Delete</strong> to close the gap.</li><li><strong>Fix the timing:</strong> drag a sentence left or right so it starts with the right shot.</li><li><strong>Try again:</strong> record a new take on another audio track, then mute the track you don't want with <strong>M</strong>.</li></ul>
<h2>Step 4: Make the voice sound clear</h2>
<ol><li><strong>Even out the level:</strong> right-click the voice clip ▸ <strong>Normalize Loudness…</strong> and choose −14 LUFS, a common level for online video.</li><li><strong>Remove rumble:</strong> drag <strong>Effects ▸ Audio Effects ▸ High-Pass</strong> onto the clip. 80–100 Hz removes traffic, desk bumps and air-conditioning without thinning the voice.</li><li><strong>Smooth loud and quiet words:</strong> add the <strong>Compressor</strong>.</li><li><strong>Add clarity:</strong> in the <strong>Parametric EQ</strong>, raise High a little.</li></ol>
<p>For background hiss and hum, see <a href="/docs/audio-effects/">Audio effects: EQ, compressor, noise removal</a>; for a quiet recording, <a href="/tutorials/make-quiet-audio-louder/">how to make quiet audio louder</a>.</p>
<h2>Step 5: Add music under the voiceover</h2>
<p>Put music on its own track, select it and apply <strong>Effects ▸ Smart Audio ▸ Auto Duck Music Under Voice</strong>. The music then dips automatically wherever you speak. The full method is in <a href="/blog/add-music-to-video-without-drowning-voice/">how to add music without drowning out your voice</a>.</p>
<h2>Step 6: Add captions from your voiceover</h2>
<p>Many people watch without sound. Open the <strong>Captions</strong> tab and click <strong>Auto-generate</strong>: speech recognition runs on your own computer and turns your narration into captions you can edit (<a href="/tutorials/add-subtitles-to-video-automatically/">how auto captions work</a>).</p>
<h2>Voiceover tips that make a big difference</h2>
<ul><li><strong>Smile while you talk.</strong> It sounds odd, but people can hear it (<a href="https://en.wikipedia.org/wiki/Voice-over" target="_blank" rel="noopener">more about voice-over on Wikipedia</a>).</li><li><strong>Leave pauses.</strong> A beat of silence after an important line lets it sink in — and makes editing easier.</li><li><strong>Drink water, not coffee or milk.</strong> They make the mouth sticky and noisy.</li><li><strong>Keep the same distance</strong> from the microphone for the whole recording, so the sound doesn't change between takes.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Why can't I hear the video while recording?</h3>
<p>Reelsmith mutes the program sound during recording so it doesn't leak into your microphone. Use headphones if you want to hear it.</p>
<h3>Which browser works best?</h3>
<p>Chrome and Edge. Safari and Firefox work too; every browser asks for microphone permission once.</p>
<h3>Can I import a voiceover I recorded on my phone?</h3>
<p>Yes. Import the audio file (M4A, MP3 or WAV) and drag it onto an audio track.</p>
<h3>Is my recording uploaded?</h3>
<p>No. It is recorded and kept on your device.</p>
<p>Ready? <a href="/">Open the editor</a> and record your first take.</p>`;

await savePostScript({
  title: 'How to Record a Voiceover for a Video (Free, No App)',
  slug: 'how-to-record-a-voiceover',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-28T10:00:00+06:00'),
  excerpt: 'Record a voiceover for a video right on the timeline while the pictures play, then clean it up, add music underneath and caption it — free in your browser.',
  metaTitle: 'How to Record a Voiceover for a Video (Free)',
  metaDescription: 'Record a voiceover for a video on the timeline while it plays, make the voice clear, add music and captions — free in your browser, nothing uploaded.',
  focusKeyword: 'record a voiceover', synonyms: 'voice-over, narration, voiceover for a video, record narration, voice recording',
  keywords: 'record voiceover, voice over video, narration, microphone, normalize loudness, auto duck, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Record a voiceover: narration clip on audio track A2 with the Audio Track Mixer and mic buttons' },
  contentHtml: html, order: 99,
});
process.exit(0);
