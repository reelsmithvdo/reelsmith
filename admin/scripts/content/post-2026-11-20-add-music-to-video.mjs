// Blog post, scheduled 2026-11-20 10:00 (Asia/Dhaka): "How to Add Music to a Video Without Drowning Out Your Voice".
// Image: src/assets/shots/music.jpg (scripts/shots/scenes.js "music"). Features: creative.js Auto Duck, audiotools.js loudness.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/music.jpg';
const html = `<p>Music makes a video feel finished — but only if people can still hear what you say. This guide shows how to add music to a video so it sits under your voice instead of fighting it: put it on its own track, fade it in and out, let the editor lower it automatically while you speak, and balance the final mix. Everything happens for free in Reelsmith, an editor that runs in your browser, so your files are never uploaded.</p>
<p>Also, the same steps work for a vlog, a tutorial, a product video or a podcast clip.</p>
${fig(IMG, 'Add music to a video: voice on audio track A1 and background music on A2 with Auto Duck keyframes lowering it under speech', 'Voice on A1, music on A2. Auto Duck added the volume keyframes that dip the music wherever someone speaks.')}
<h2>Before you add music to a video: get the rights</h2>
<p>Only use music you are allowed to use. Popular songs can get your video muted, blocked or monetised by someone else. For example, YouTube's Audio Library offers royalty-free music and sound effects for creators; some tracks require a credit in your video's description, so check each one (<a href="https://support.google.com/youtube/answer/3376882" target="_blank" rel="noopener">YouTube Help: Audio Library</a>). Other good sources are music you made yourself or tracks you licensed.</p>
<h2>Step 1: Import the video and the music</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>. Select your video and the music file — MP3, WAV and M4A all work.</li><li>Drag the video onto <strong>V1</strong>. Its own sound (your voice) lands on <strong>A1</strong>.</li><li>Drag the music onto the empty track below, <strong>A2</strong>.</li></ol>
${tip('Keep voice and music on separate audio tracks. That way you can mute, solo or adjust each one on its own, and Auto Duck can tell them apart.')}
<h2>Step 2: Make the music fit the video</h2>
<ul><li><strong>Too long?</strong> Drag the end of the music clip to where the video ends, or press <code>C</code> for the razor tool, cut, and delete the rest.</li><li><strong>Too short?</strong> In that case, drag the song onto the timeline a second time, right after the first, and blend the joint with a crossfade (step 3).</li><li><strong>Starts in the wrong place?</strong> Slide the clip left so the music starts at a strong moment, then trim the beginning.</li></ul>
<h2>Step 3: Fade the music in and out</h2>
<p>An abrupt start or stop sounds like a mistake. Select the music clip and set <strong>Fade In</strong> and <strong>Fade Out</strong> in <strong>Effect Controls ▸ Audio</strong> — one to three seconds usually feels natural. Alternatively, drag <strong>Constant Power</strong> from the audio transitions onto the clip's edge; between two music clips, it makes a smooth crossfade.</p>
<h2>Step 4: Lower the music automatically while you speak</h2>
<p>This is the step that keeps your voice clear. Select the <strong>music</strong> clip and apply <strong>Effects ▸ Smart Audio ▸ Auto Duck Music Under Voice</strong>. Reelsmith finds where someone speaks on the other audio tracks and lowers the music there by 14 dB, with smooth ramps in and out. As a result, the music fills the pauses and steps back during speech — just like on TV.</p>
<p>The dips are ordinary volume keyframes, so you can still change them: select the music, open <strong>Effect Controls ▸ Audio ▸ Volume</strong> and move or delete keyframes. More in <a href="/docs/voice-sfx/">Voice effects, sound effects and auto ducking</a>.</p>
<h2>Step 5: Balance the voice and the music</h2>
<ol><li><strong>Even out the voice:</strong> right-click your voice clip ▸ <strong>Normalize Loudness…</strong> and choose <strong>−14 LUFS</strong>, the usual level for YouTube and most online video.</li><li><strong>Set the music level:</strong> lower the music clip's <strong>Volume</strong> in Effect Controls, or pull down the A2 fader in the <strong>Audio Track Mixer</strong>, until the music supports the voice without competing.</li><li><strong>Check the meters</strong> on the right of the timeline while you play: keep the peaks below 0, because the top turns red near clipping.</li></ol>
<p>Then listen once on headphones and once on a phone speaker. If you can understand every word on the phone, the mix is right. For quiet recordings, see <a href="/tutorials/make-quiet-audio-louder/">how to make quiet audio louder</a>, and for all mixing tools <a href="/docs/audio-mixing/">Audio mixing</a>.</p>
<h2>Step 6: Export the video with music</h2>
<p>Click <strong>Export</strong>, choose a preset — for example <strong>YouTube 1080p Full HD</strong> — and click <strong>Export</strong>. Every unmuted audio track is mixed into the file with its volume, fades and ducking. In addition, <strong>File ▸ Export Audio…</strong> saves just the soundtrack as M4A or WAV if you need it separately.</p>
<h2>Tips for choosing background music</h2>
<ul><li><strong>Match the mood and the pace.</strong> Calm music for tutorials, upbeat music for vlogs and montages.</li><li><strong>Prefer instrumentals under speech.</strong> After all, lyrics compete with your words, so save vocal tracks for parts without talking.</li><li><strong>Cut on the beat.</strong> The waveform shows the beats; cutting your video there makes the edit feel deliberate.</li><li><strong>Use sound effects sparingly.</strong> For instance, <strong>Effects ▸ Sound Effects</strong> has original whooshes, pops and dings that are free to use in your videos.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I add music to a video and remove the original sound?</h3>
<p>Yes. Select the clip, unlink video and audio with <code>⌘L</code> (Ctrl+L on Windows), select the original audio and press Delete. See <a href="/tools/remove-audio-from-video/">remove audio from a video</a>.</p>
<h3>Can I use more than one song?</h3>
<p>Yes. Place songs one after another on the music track and crossfade them with Constant Power, or put a second song on another audio track.</p>
<h3>Why is my music still too loud?</h3>
<p>Auto Duck lowers the music only while someone speaks. Therefore, if it is too loud between sentences, lower the music clip's overall volume as well.</p>
<h3>Is my video uploaded when I add music?</h3>
<p>No. Importing, mixing and exporting all happen on your device.</p>
<p>Ready? Try the <a href="/tools/add-music-to-video/">free background music tool</a>, or <a href="/">open the editor</a>.</p>`;

await savePostScript({
  title: 'How to Add Music to a Video Without Drowning Out Your Voice',
  slug: 'add-music-to-video-without-drowning-voice',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-20T10:00:00+06:00'),
  excerpt: 'Add background music that sits under your voice: put it on its own track, fade it, let Auto Duck lower it while you speak and balance the mix — free, in your browser.',
  metaTitle: 'Add Music to a Video Without Drowning Your Voice',
  metaDescription: 'Add music to a video so your voice stays clear: a separate track, fades, automatic ducking under speech and an even mix — free, in your browser, no upload.',
  focusKeyword: 'add music to a video', synonyms: 'background music, add a song to a video, music under voice, audio ducking',
  keywords: 'add music to video, background music, auto duck, audio ducking, voice over music, royalty free music, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Add music to a video: voice and background music on separate tracks with Auto Duck keyframes' },
  contentHtml: html, order: 99,
});
process.exit(0);
