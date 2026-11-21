// Blog post, scheduled 2026-12-22 10:00 (Asia/Dhaka): "How to Remove Audio from a Video". Topic from Search Console
// (many "remove audio from video online" queries). Image: src/assets/shots/muteaudio.jpg (scenes-blog2.js "muteaudio").
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/muteaudio.jpg';
const html = `<p>Wind noise, a loud street, a song you can't use, or a conversation you don't want people to hear — there are plenty of reasons to remove audio from a video. This guide shows how to remove audio from a video completely, how to silence just one part of it, and how to replace the sound with music or your own voice. It all works for free in Reelsmith, an editor that runs in your browser, so your video is never uploaded and the export has no watermark.</p>
<p>Also, the same steps work on a computer, a tablet and a phone.</p>
${fig(IMG, 'Remove audio from a video: the clip unlinked, the middle of its sound deleted on A1 and music on A2', 'The video stays on V1. Its sound on A1 was unlinked and cut, and the middle part deleted; music plays on A2.')}
<h2>Three ways to remove audio from a video</h2>
<ul><li><strong>Delete the sound:</strong> the clip's audio is removed from the timeline. Best when you never want it back.</li><li><strong>Mute the track:</strong> one click, and you can turn it back on any time. Best while you're still deciding.</li><li><strong>Turn it down:</strong> lower the volume instead of removing it, for example to keep a little background atmosphere under music.</li></ul>
<h2>Step 1: Import the video</h2>
<ol><li>Open <a href="/">the editor</a> and click <strong>Import</strong>, or drag the file onto the window. MP4, MOV, WebM and most phone videos work.</li><li>Drag the clip onto the timeline. The picture lands on <strong>V1</strong> and its sound on <strong>A1</strong>, linked together.</li></ol>
<h2>Step 2: Remove the audio from the whole video</h2>
<ol><li>Select the clip and press <code>⌘L</code> (<code>Ctrl+L</code> on Windows), or right-click it ▸ <strong>Unlink</strong>. Now picture and sound are separate clips.</li><li>Click an empty spot, then click only the audio clip on A1 and press <strong>Delete</strong>.</li><li>Press Space to play: the video runs in silence.</li></ol>
<p>Alternatively, click <strong>M</strong> on the A1 track header to mute the whole track. A muted track is left out of the export, and one more click brings the sound back.</p>
${tip('To select just the audio of a linked clip without unlinking it, hold Alt (Option on a Mac) and click the audio part.')}
<h2>Step 3: Remove audio from only part of a video</h2>
<p>Often only a few seconds are the problem — a cough, a car horn, a private remark. In that case, keep the rest of the sound:</p>
<ol><li>Unlink the clip as in step 2 and select only its audio.</li><li>Move the playhead to where the unwanted sound starts and press <code>⌘K</code> (<code>Ctrl+K</code>) to split the audio there.</li><li>Move to where it ends and split again.</li><li>Select the piece in the middle and press <strong>Delete</strong>. The picture keeps playing; only the sound has a gap.</li></ol>
<p>A hard jump into silence can sound odd, so give the cut edges a short fade: select a piece and set <strong>Fade In</strong> or <strong>Fade Out</strong> in <strong>Effect Controls ▸ Audio</strong> to about 0.2 seconds. More on cutting in <a href="/docs/splitting/">Splitting clips</a>.</p>
<h2>Step 4: Lower the sound instead of removing it</h2>
<p>Sometimes silence feels empty. Select the audio clip and lower <strong>Volume</strong> in <strong>Effect Controls ▸ Audio</strong>, for example to 20 %. To lower it only for a moment, click the stopwatch next to Volume to add keyframes, then set a low value where the noise is and the normal value around it. Our guide to <a href="/blog/remove-background-noise-from-audio/">removing background noise</a> shows how to clean up hum and hiss without muting anything.</p>
<h2>Step 5: Replace the sound (optional)</h2>
<ul><li><strong>Music:</strong> drag a song onto an empty audio track, trim it to the length of the video and fade it in and out. See <a href="/blog/add-music-to-video-without-drowning-voice/">how to add music to a video</a>.</li><li><strong>Your voice:</strong> click the <strong>mic</strong> button on an audio track header to record a narration from the playhead. See <a href="/blog/how-to-record-a-voiceover/">how to record a voice-over</a>.</li><li><strong>Sound effects:</strong> <strong>Effects ▸ Sound Effects</strong> has whooshes, pops and impacts that are free to use.</li></ul>
<h2>Step 6: Export the video without audio</h2>
<p>Click <strong>Export</strong>, choose a preset such as <strong>YouTube 1080p Full HD</strong> or <strong>Match Source – High bitrate</strong>, and click <strong>Export</strong>. Deleted and muted audio is not included, and nothing else changes in the picture. Moreover, there is no watermark and no sign-up.</p>
<h2>Why people remove audio from a video</h2>
<ul><li><strong>Copyright music:</strong> a song playing in the background can lead to a copyright claim when you upload the video, which may block it or send its earnings to someone else (<a href="https://support.google.com/youtube/answer/6013276" target="_blank" rel="noopener">YouTube Help: copyright claim basics</a>). Removing or replacing the sound avoids that.</li><li><strong>Bad sound:</strong> wind, traffic or a buzzing fridge that no filter can rescue.</li><li><strong>Privacy:</strong> other people's conversations, names or phone calls in the background.</li><li><strong>B-roll and backgrounds:</strong> clips that play under a voice-over or on a website usually need no sound of their own.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I remove audio from a video on my phone?</h3>
<p>Yes. Open reelsmithapp.com in your phone's browser, import the video and long-press the clip — long-press works like a right-click — then choose <strong>Unlink</strong> and delete the audio. See <a href="/blog/edit-video-on-phone-in-browser/">editing video on a phone</a>.</p>
<h3>Does removing the audio lower the video quality?</h3>
<p>No more than any export. Choose <strong>Match Source – High bitrate</strong> to keep the picture as sharp as the original.</p>
<h3>Can I keep the audio as a separate file?</h3>
<p>Yes. <strong>File ▸ Export Audio…</strong> saves the sound as M4A or WAV — handy before you remove it. See <a href="/tools/extract-audio-from-video/">extract audio from a video</a>.</p>
<h3>Is my video uploaded when I remove the audio?</h3>
<p>No. Everything happens on your device, and the file is saved straight to it.</p>
<p>Ready? Use the <a href="/tools/remove-audio-from-video/">free remove audio tool</a>, or <a href="/">open the editor</a>.</p>`;

await savePostScript({
  title: 'How to Remove Audio from a Video (All of It or Just One Part)',
  slug: 'how-to-remove-audio-from-a-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-22T10:00:00+06:00'),
  excerpt: 'Remove audio from a video completely, silence just one part, or replace it with music or your voice — free in your browser, with no upload and no watermark.',
  metaTitle: 'How to Remove Audio from a Video, Free',
  metaDescription: 'Remove audio from a video online for free: mute it all, silence one part or replace it with music or a voice-over. No upload, no watermark, no sign-up.',
  focusKeyword: 'remove audio from a video', synonyms: 'mute a video, remove sound from video, delete audio from video, video without sound',
  keywords: 'remove audio from video, mute video, remove sound from video online, video without sound, replace audio, free, no watermark',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Remove audio from a video: unlinked sound with the middle part deleted and music on a second track' },
  contentHtml: html, order: 99,
});
process.exit(0);
