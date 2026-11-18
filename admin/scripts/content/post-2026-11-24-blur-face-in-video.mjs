// Blog post, scheduled 2026-11-24 10:00 (Asia/Dhaka): "How to Blur a Face in a Video". Image: src/assets/shots/blurface.jpg
// (scenes-blog.js "blurface"). Method: duplicate on V2 + Mosaic/Gaussian Blur + ellipse mask + Track ▶ (docs masks, tracking, video-effects).
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/blurface.jpg';
const html = `<p>Filmed someone who didn't agree to be in your video? Or a licence plate, a house number or a screen with private details? This guide shows how to blur a face in a video so it stays hidden even while the person moves: a blurred copy of the clip, a mask around the face, and tracking that makes the mask follow. It all works for free in Reelsmith, an editor that runs in your browser — handy for exactly this job, because the footage never leaves your computer.</p>
${fig(IMG, 'Blur a face in a video: a copy of the clip on V2 with Mosaic and an ellipse mask around the face in the Program monitor', 'A copy of the clip on V2 with Mosaic, limited to the face by an ellipse mask. Track ▶ makes the mask follow the face.')}
<h2>How blurring a face works</h2>
<p>You stack two copies of the same clip. The bottom copy (V1) stays sharp. The top copy (V2) gets a blur or pixelation effect, and a <strong>mask</strong> cuts it down to an oval around the face. As a result, you see the sharp video everywhere except inside the mask. Then <strong>tracking</strong> moves the mask with the face.</p>
<h2>Step 1: Duplicate the clip onto V2</h2>
<ol><li>Open <a href="/">the editor</a>, import your video and drag it onto <strong>V1</strong>.</li><li>Hold <strong>Alt</strong> (Option on a Mac) and drag the clip straight up onto <strong>V2</strong>. That makes an exact copy, lined up in time.</li><li>Optionally, delete the copy's audio clip so the sound isn't doubled: Alt-click it and press Delete.</li></ol>
<h2>Step 2: Blur the copy</h2>
<p>Open <strong>Effects ▸ Video Effects</strong> and drag <strong>Mosaic</strong> onto the V2 clip for the classic pixelated look. Alternatively, use <strong>Effects ▸ Blur &amp; Motion ▸ Gaussian Blur</strong> for a soft blur. For now the whole picture is blurred — the mask fixes that next.</p>
${tip('Pixelation hides a face more reliably than a light blur. If you use Gaussian Blur, raise the amount until the face is truly unrecognisable.')}
<h2>Step 3: Draw a mask around the face</h2>
<ol><li>Select the V2 clip and open <strong>Effect Controls ▸ Opacity ▸ Masks</strong>.</li><li>Click <strong>Ellipse</strong>. An oval appears in the Program monitor.</li><li>Click <strong>Edit</strong> on the mask, then drag inside it to move it over the face and drag the corner handles to fit. Keep it a little larger than the face.</li><li>Raise <strong>Feather</strong> to soften the edge, so the blur doesn't end in a hard line.</li></ol>
<p>Now only the face is blurred. For odd shapes, use the <strong>Pen</strong> tool (<code>P</code>) and click points around the area instead. See <a href="/docs/masks/">Masks</a>.</p>
<h2>Step 4: Make the blur follow the face</h2>
<ol><li>Move the playhead to the first frame where the face is visible.</li><li>On the mask in Effect Controls, click <strong>Track ▶</strong>.</li><li>A progress window shows the frames being analysed. When it finishes, the mask moves with the face to the end of the clip.</li></ol>
<p>Play it back and check every second. Tracking works best on faces with clear detail and steady light; it follows position, not size, so if the person walks toward the camera, keep the mask generous. If the tracking slips, click <strong>Clear track</strong>, move the playhead to where it went wrong, and track again from there. More in <a href="/docs/tracking/">Tracking a mask</a>.</p>
<h2>Blur several faces or objects</h2>
<ul><li><strong>Two faces at once:</strong> add a second mask to the same V2 clip. Masks on one clip combine.</li><li><strong>A face that appears only briefly:</strong> cut the V2 copy with the razor (<code>C</code>) so it only covers those seconds.</li><li><strong>Everything except one person:</strong> tick <strong>Inverted</strong> on the mask to blur the background instead.</li></ul>
<h2>Is blurring enough to protect someone?</h2>
<p>Usually, but not always. A light blur can sometimes be partly reversed, and people can still be recognised by their voice, clothes or surroundings (<a href="https://en.wikipedia.org/wiki/Pixelization" target="_blank" rel="noopener">more about pixelization on Wikipedia</a>). Therefore use strong Mosaic, cover the whole head, and consider cutting the scene if the person remains easy to identify. When in doubt, ask for permission.</p>
<h2>Frequently asked questions</h2>
<h3>Can I blur a licence plate or a screen the same way?</h3>
<p>Yes. Use a <strong>Rectangle</strong> mask instead of an ellipse and track it like a face.</p>
<h3>Why is the whole video blurred?</h3>
<p>The blur effect is on the V2 copy, but the mask is missing or on the wrong clip. Select the V2 clip and add the mask there.</p>
<h3>Can I blur the background instead of a face?</h3>
<p>Yes — tick Inverted on the mask. For a vertical video with blurred bars at the sides, see <a href="/tools/blur-video-background/">blur a video background</a>.</p>
<h3>Is my video uploaded to blur it?</h3>
<p>No. Masking, tracking and exporting all happen on your device, which matters when the footage is private.</p>
<p>Ready? <a href="/">Open the editor</a> and blur your first face in a couple of minutes.</p>`;

await savePostScript({
  title: 'How to Blur a Face in a Video (and Make It Follow the Person)',
  slug: 'how-to-blur-a-face-in-a-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-24T10:00:00+06:00'),
  excerpt: 'Blur a face in a video so it stays hidden while the person moves: a blurred copy, an ellipse mask and tracking — free in your browser, with nothing uploaded.',
  metaTitle: 'How to Blur a Face in a Video (Free)',
  metaDescription: 'Blur a face in a video for free: a pixelated copy, an ellipse mask and tracking that follows the person — in your browser, with your footage never uploaded.',
  focusKeyword: 'blur a face in a video', synonyms: 'blur face, pixelate face, hide a face, censor a face, blur part of a video',
  keywords: 'blur face in video, pixelate face, mosaic, mask tracking, hide face, censor video, privacy, free',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Blur a face in a video: pixelated face inside an ellipse mask with the mask settings in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
