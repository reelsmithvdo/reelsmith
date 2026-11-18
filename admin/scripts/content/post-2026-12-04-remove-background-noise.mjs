// Blog post, scheduled 2026-12-04 10:00 (Asia/Dhaka): "How to Remove Background Noise from Audio". Image: src/assets/shots/noise.jpg
// (scenes-blog.js "noise"). Features: Effects ▸ Audio Effects (High-Pass, DeHum, Noise Gate, Parametric EQ, Compressor) — docs audio-effects.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/noise.jpg';
const html = `<p>Traffic rumble, a humming fridge, wind, the hiss between words — background noise makes even a great interview hard to listen to. This guide shows how to remove background noise from audio in a video with four simple effects, in the right order, and what to do when noise can't be removed. You'll use Reelsmith, a free editor that runs in your browser, so your recordings are never uploaded.</p>
${fig(IMG, 'Remove background noise from audio: Parametric EQ, High-Pass, DeHum and Noise Gate on an outdoor interview clip', 'An outdoor interview with High-Pass (100 Hz), DeHum, Noise Gate and a gentle EQ on its audio — all in Effect Controls ▸ Audio.')}
<h2>First, find out what kind of noise it is</h2>
<p>Play the clip with headphones and listen to a pause between sentences. Different noises need different tools:</p>
<ul><li><strong>Low rumble</strong> — traffic, wind, footsteps, air-conditioning, bumps on the desk → <strong>High-Pass</strong>.</li><li><strong>A steady tone</strong> — electrical hum from lights, cables or a cheap power adapter → <strong>DeHum</strong>.</li><li><strong>Hiss or room noise between words</strong> → <strong>Noise Gate</strong>.</li><li><strong>A dull or boomy voice</strong> → <strong>Parametric EQ</strong>.</li></ul>
<h2>Step 1: Select the audio clip</h2>
<p>Open <a href="/">the editor</a>, import your video and drag it onto the timeline. The sound lands on <strong>A1</strong>. Click that audio clip, then open the <strong>Effects</strong> panel and find <strong>Audio Effects</strong>. You add each effect by dragging it onto the clip; its controls appear in <strong>Effect Controls ▸ Audio</strong>.</p>
<h2>Step 2: Cut the rumble with High-Pass</h2>
<p>Drag <strong>High-Pass (remove rumble)</strong> onto the clip. It removes everything below the <strong>Cut-off</strong>. Start at 80 Hz for a voice and try up to 120 Hz for wind or traffic. A voice has little below that, so it stays natural while the rumble disappears. If the voice starts to sound thin, lower the cut-off again.</p>
<h2>Step 3: Remove electrical hum with DeHum</h2>
<p>Drag <strong>DeHum (50/60 Hz)</strong> onto the clip. Choose <strong>50 Hz</strong> if the recording was made in Europe, Asia, Africa or Australia, and <strong>60 Hz</strong> in North America and parts of South America — it matches the mains electricity. DeHum removes the tone and its harmonics.</p>
<h2>Step 4: Silence the gaps with Noise Gate</h2>
<p>Drag <strong>Noise Gate</strong> onto the clip. It silences the audio while it is quieter than the <strong>Threshold</strong>, so hiss between words vanishes while speech passes through (<a href="https://en.wikipedia.org/wiki/Noise_gate" target="_blank" rel="noopener">how a noise gate works</a>).</p>
<ol><li>Play a part with pauses.</li><li>Raise the threshold slowly until the hiss in the pauses disappears.</li><li>If the beginnings or ends of words get cut off, lower it a little.</li></ol>
${tip('A gate works best after the rumble and hum are gone, because they keep the level above the threshold. That is why the order matters: High-Pass, DeHum, then Noise Gate.')}
<h2>Step 5: Make the voice clearer with EQ</h2>
<p>Drag <strong>Parametric EQ (3-band)</strong> onto the clip:</p>
<ul><li><strong>Low (200 Hz)</strong> down 2–4 dB if the voice sounds boomy or muddy.</li><li><strong>Mid</strong> up 1–3 dB around 2,000–3,000 Hz for presence.</li><li><strong>High (4 kHz)</strong> up a little for clarity — but not too much, or hiss comes back.</li></ul>
<p>Finally, add the <strong>Compressor</strong> to even out loud and quiet words, and use <strong>Normalize Loudness…</strong> (right-click the clip) to set the final level. All five effects are explained in <a href="/docs/audio-effects/">Audio effects: EQ, compressor, noise removal</a>.</p>
<h2>When noise can't be removed</h2>
<p>These tools work well on steady noise. However, they can't separate a voice from music, a crowd talking or a passing siren at the same volume. In that case:</p>
<ul><li>Cut the noisiest moment, or cover it with B-roll and music.</li><li>Re-record the line as a voiceover — see <a href="/blog/how-to-record-a-voiceover/">how to record a voiceover</a>.</li><li>Add captions so every word is still understood.</li></ul>
<h2>Prevent noise next time</h2>
<ul><li>Get the microphone close to the mouth — a clip-on mic beats the camera's built-in one.</li><li>Use a foam or fur windscreen outdoors.</li><li>Turn off fans, fridges and air-conditioning while recording.</li><li>Record 10 seconds of silence first, so you can hear what noise is in the room.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Do the effects change my original file?</h3>
<p>No. They are applied during playback and export; the file on your computer stays as it is. Remove an effect with its chip in Effect Controls.</p>
<h3>Can I use the same settings on other clips?</h3>
<p>Yes. Apply the same effects to the other clips from that recording; the settings that worked for one usually work for all.</p>
<h3>Is my audio uploaded?</h3>
<p>No. All processing happens in your browser, on your device.</p>
<p>Ready? <a href="/">Open the editor</a>, or make a quiet recording louder with <a href="/tutorials/make-quiet-audio-louder/">this tutorial</a>.</p>`;

await savePostScript({
  title: 'How to Remove Background Noise from Audio in a Video (Free)',
  slug: 'remove-background-noise-from-audio',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-04T10:00:00+06:00'),
  excerpt: 'Remove background noise from audio in a video: High-Pass for rumble, DeHum for hum, Noise Gate for hiss and EQ for clarity — in the right order, free in your browser.',
  metaTitle: 'Remove Background Noise from Audio (Free)',
  metaDescription: 'Remove background noise from audio in your video: cut rumble, hum and hiss with High-Pass, DeHum, Noise Gate and EQ — free in your browser, no upload.',
  focusKeyword: 'remove background noise from audio', synonyms: 'remove background noise, noise reduction, remove hum, remove hiss, clean up audio',
  keywords: 'remove background noise, noise reduction, noise gate, high pass filter, remove hum, clean audio, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Remove background noise from audio: High-Pass, EQ and Noise Gate settings on an interview clip' },
  contentHtml: html, order: 99,
});
process.exit(0);
