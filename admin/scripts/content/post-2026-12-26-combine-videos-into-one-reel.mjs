// Blog post, scheduled 2026-12-26 10:00 (Asia/Dhaka): "How to Combine Videos into One Reel". Topic from Search Console
// ("combine reels", merge videos). Image: src/assets/shots/mergereels.jpg (scenes-blog2.js "mergereels").
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/mergereels.jpg';
const html = `<p>A good Reel is rarely one long shot. It's four or five short clips — the arrival, the view, the food, the sunset — joined into one smooth video with music. This guide shows how to combine videos into one Reel: set up a vertical frame, put the clips in order, fill the screen, smooth the cuts, add music and export a file that's ready for Instagram, TikTok or YouTube Shorts. You can do it for free in Reelsmith, an editor that runs in your browser, so your clips are never uploaded.</p>
${fig(IMG, 'Combine videos into one Reel: four vertical clips in a row on a 1080×1920 timeline, with cross dissolves and music', 'Four phone clips joined in a 9:16 sequence. Each clip fills the frame, and short Cross Dissolves soften the cuts.')}
<h2>Step 1: Start a vertical 9:16 project</h2>
<p>Reels are vertical. Vertical video fills a phone screen held upright, which is why every short-video app uses it (<a href="https://en.wikipedia.org/wiki/Vertical_video" target="_blank" rel="noopener">background on Wikipedia</a>). There are two quick ways to set it up:</p>
<ul><li><strong>Template:</strong> on the start screen, pick <strong>Shorts / Reels / TikTok</strong>. You get a 1080×1920 sequence with a hook title, a progress bar and a follow button that you can keep or delete.</li><li><strong>Empty project:</strong> choose <strong>Sequence ▸ Sequence Settings…</strong> and pick <strong>Vertical 9:16 (1080×1920)</strong>.</li></ul>
<h2>Step 2: Import the videos you want to combine</h2>
<ol><li>Click <strong>Import</strong> and select every clip you want to use — you can choose many files at once. Photos work too.</li><li>Switch the Project panel to <strong>Grid</strong> to see a picture of each clip — handy when phone files are only numbers.</li></ol>
<h2>Step 3: Combine the videos in the right order</h2>
<ol><li>Drag the first clip onto <strong>V1</strong> at the start of the timeline.</li><li>Drag the next clip right after it. Snapping (the magnet button, or <code>S</code>) makes it attach to the end of the previous one.</li><li>Repeat until all clips are on the timeline. To change the order, drag a clip to a new place.</li><li>If a gap appears, right-click inside it ▸ <strong>Ripple Delete Gap</strong>.</li></ol>
${tip('Start with your strongest clip. People decide in the first second whether to keep watching, so save the slow "arriving" shot for later.')}
<h2>Step 4: Trim each clip to its best moment</h2>
<p>However, most phone clips are too long. Drag a clip's left or right edge to shorten it, and the timeline shows the new length as you drag. For example, two to four seconds per clip feels lively; keep a longer clip only when something happens in it. For tighter edits, press <code>B</code> for the Ripple Edit tool: trimming one clip then closes the gap automatically. More in <a href="/docs/select-move-trim/">Select, move and trim</a>.</p>
<h2>Step 5: Fill the vertical frame</h2>
<p>Clips filmed upright fill the frame already. A landscape clip, however, shows black bars above and below. Choose one fix per clip:</p>
<ul><li><strong>Fill and crop:</strong> right-click the clip ▸ <strong>Scale to Fill Frame</strong>. It zooms in until the frame is full; move <strong>Position</strong> in <strong>Effect Controls ▸ Motion</strong> to keep the subject in view.</li><li><strong>Keep the whole picture:</strong> apply <strong>Background Blur Fill</strong> from <strong>Effects ▸ Creative Effects</strong> to fill the bars with a soft blurred copy. See the <a href="/tools/blur-video-background/">blurred background tool</a>.</li></ul>
<h2>Step 6: Smooth the cuts</h2>
<ul><li><strong>Video:</strong> drag <strong>Cross Dissolve</strong> from <strong>Effects ▸ Video Transitions</strong> onto a cut, or move the playhead to a cut, deselect everything and press <code>⌘D</code> (<code>Ctrl+D</code>) to add one there. Keep them short — about half a second — so the Reel keeps its pace. See <a href="/blog/how-to-add-transitions-between-video-clips/">how to add transitions between clips</a>.</li><li><strong>Sound:</strong> if your clips have their own sound, select the audio clips, right-click ▸ <strong>Normalize Loudness…</strong> so none is suddenly louder, and drag <strong>Constant Power</strong> from <strong>Effects ▸ Audio Transitions</strong> onto the cuts.</li><li><strong>Colour:</strong> clips from different times of day can look mismatched. A quick <a href="/blog/how-to-color-correct-a-video/">colour correction</a> makes them look like one video.</li></ul>
<h2>Step 7: Add music and a title</h2>
<ol><li>Drag a song onto an empty audio track and trim it to the end of the last clip. Cutting your clips on the beat makes the Reel feel deliberate — the waveform shows where the beats are.</li><li>Press <code>T</code> and add a short hook at the top, inside the <strong>Safe</strong> margins, so Instagram's buttons don't cover it.</li></ol>
<p>Only use music you're allowed to use; see <a href="/blog/add-music-to-video-without-drowning-voice/">how to add music to a video</a>.</p>
<h2>Step 8: Export the Reel</h2>
<p>Click <strong>Export</strong> and choose <strong>YouTube Shorts / Reels / TikTok (9:16)</strong>. The result is one MP4 at 1080×1920, ready to upload from your phone or computer. Then upload it as a Reel and pick a cover frame in the app.</p>
<h2>Frequently asked questions</h2>
<h3>Can I combine videos filmed in different formats?</h3>
<p>Yes. MP4, MOV and WebM clips can share one timeline, and so can different frame sizes; the sequence settings decide the size of the final video.</p>
<h3>How long can a Reel be?</h3>
<p>Reelsmith doesn't limit the length, but Instagram does, and the limit has changed over the years — check it in the app before you post. Short Reels tend to be watched to the end more often.</p>
<h3>Can I combine videos for a Reel on my phone?</h3>
<p>Yes. Open reelsmithapp.com in your phone's browser; the steps are the same. See <a href="/blog/edit-video-on-phone-in-browser/">editing video on a phone</a>.</p>
<h3>Are my clips uploaded?</h3>
<p>No. Everything happens on your device, and there's no watermark on the export.</p>
<p>Ready? Use the <a href="/tools/merge-videos/">free merge videos tool</a>, or read <a href="/blog/how-to-edit-youtube-shorts/">how to edit YouTube Shorts</a> for more vertical-video tips.</p>`;

await savePostScript({
  title: 'How to Combine Videos into One Reel (Free, in Your Browser)',
  slug: 'combine-videos-into-one-reel',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-26T10:00:00+06:00'),
  excerpt: 'Combine several clips into one Instagram Reel: a 9:16 frame, clips in order, trimmed and filling the screen, smooth cuts, music, and a ready-to-post MP4.',
  metaTitle: 'How to Combine Videos into One Reel, Free',
  metaDescription: 'Combine videos into one Reel for Instagram, TikTok or Shorts: set up 9:16, order and trim clips, smooth the cuts, add music and export. Free, no upload.',
  focusKeyword: 'combine videos', synonyms: 'merge videos for Reels, combine Reels, join clips for Instagram, combine clips into one video',
  keywords: 'combine videos, combine reels, merge videos for instagram, join clips, instagram reels editor, 9:16, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Combine videos into one Reel: four vertical clips joined on a 9:16 timeline with cross dissolves' },
  contentHtml: html, order: 99,
});
process.exit(0);
