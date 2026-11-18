// Blog post, scheduled 2026-12-20 10:00 (Asia/Dhaka): "How to Edit a Video on Your Phone in the Browser". Image: src/assets/shots/phone.jpg
// (three real phone-layout screenshots, scenes phone-a/b/c + scripts/shots/combine-phone.js). Layout per touch.js: tab bar
// Media / Effects / Edit / Captions / Library / Audio, long-press = right-click, Program + Timeline fill the screen.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/phone.jpg';
const html = `<p>You filmed it on your phone, so why move it to a computer to edit? This guide shows how to edit a video on your phone in the browser — no app to install, no account, no watermark. You'll trim, add text and music, use effects and export a vertical video ready for Shorts, Reels or TikTok. Reelsmith works in Safari on iPhone and Chrome on Android, and your clips never leave the phone.</p>
${fig(IMG, 'Edit a video on your phone: the Reelsmith phone layout with the timeline, the Effects sheet and Effect Controls', 'Three real phone screens: the timeline of a vertical bakery Short, the Effects sheet and the Edit sheet (Effect Controls).')}
<h2>Why edit in the browser instead of an app?</h2>
<ul><li><strong>Nothing to install.</strong> Open the website and start — useful when your storage is full.</li><li><strong>Private.</strong> Editing and export happen on the phone; your videos are not uploaded to a server.</li><li><strong>No watermark, no sign-up.</strong> Exports are clean.</li><li><strong>The same editor everywhere.</strong> Start on the phone, finish on a laptop with the full desktop layout.</li></ul>
<h2>How the phone layout works</h2>
<p>On a phone, the <strong>Program monitor</strong> and the <strong>timeline</strong> fill the screen. Everything else opens as a sheet from the bar at the bottom:</p>
<ul><li><strong>Media</strong> — import and the project's files.</li><li><strong>Effects</strong> — transitions, effects, filters, titles, stickers and sounds.</li><li><strong>Edit</strong> — Effect Controls for the selected clip: size, position, colour, speed and audio.</li><li><strong>Captions</strong> — automatic subtitles.</li><li><strong>Library</strong> — animated graphics such as subscribe buttons and arrows.</li><li><strong>Audio</strong> — the Audio Track Mixer.</li></ul>
<p>Tap to select, drag to move clips, and <strong>press and hold</strong> anything for the menu you'd get with a right-click on a computer.</p>
<h2>Step 1: Start a vertical project</h2>
<p>Open <a href="/">reelsmithapp.com</a> in your phone's browser. On the start screen, choose the <strong>Shorts / Reels / TikTok</strong> template — a 9:16 project with a hook title, a progress bar and a follow button, ready to change. Or start an empty project: the first video you add sets the shape, so a vertical phone video makes a vertical project.</p>
<h2>Step 2: Import your clips</h2>
<p>Open <strong>Media</strong> and tap <strong>Import</strong>. Pick videos from your gallery or Files, then drag them onto <strong>V1</strong> in the timeline.</p>
<h2>Step 3: Cut it down</h2>
<ol><li>Drag the timeline to put the playhead where the unwanted part starts, then tap <strong>Clip ▸ Split at Playhead</strong> in the menu bar.</li><li>Do the same where the unwanted part ends.</li><li>Press and hold the unwanted piece ▸ <strong>Ripple Delete</strong> to remove it and close the gap.</li></ol>
<p>Short videos live on pace: cut every pause and keep only the best seconds. See <a href="/blog/editing-tips-for-short-videos/">editing tips for short videos</a>.</p>
${tip('Turn your phone sideways for a wider timeline while trimming, then back to portrait to check the vertical picture.')}
<h2>Step 4: Add text, music and effects</h2>
<ul><li><strong>Text:</strong> double-click a title in the template to change it, or use <strong>Effects ▸ Title Templates</strong>.</li><li><strong>Music:</strong> import a song and drag it onto an audio track; lower it under speech with <strong>Auto Duck</strong>.</li><li><strong>Look:</strong> select a clip and try <strong>Effects ▸ Filters</strong> or adjust colour in <strong>Edit ▸ Lumetri Color</strong>.</li><li><strong>Captions:</strong> open <strong>Captions</strong> and tap <strong>Auto-generate</strong>. The speech recognition model downloads once — use Wi-Fi for that.</li></ul>
<h2>Step 5: Export and post</h2>
<p>Tap the <strong>export</strong> button (top right), choose the <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> preset and export. The browser saves the MP4 to your downloads, and from there you can share it to any app. Vertical video is now the standard on these platforms (<a href="https://en.wikipedia.org/wiki/Vertical_video" target="_blank" rel="noopener">more about vertical video</a>). For sizes and safe areas, see <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">how to make a vertical video</a>.</p>
<h2>Tips for smooth phone editing</h2>
<ul><li><strong>Keep projects short.</strong> Phones handle a one-minute Short easily; long 4K projects are smoother on a computer.</li><li><strong>Close other apps</strong> before exporting so the phone has memory to spare.</li><li><strong>Keep the screen on</strong> while exporting — switching apps can pause the browser.</li><li><strong>Save often</strong> with the menu ▸ File ▸ Save. Projects are kept in the browser on that phone.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Does it work on iPhone and Android?</h3>
<p>Yes. Use Safari or Chrome on iPhone, and Chrome on Android. A recent phone gives the smoothest playback.</p>
<h3>Can I continue a phone project on my computer?</h3>
<p>Yes. Choose File ▸ Download Project File on the phone and open it on the computer with File ▸ Open Project File. Bring the video files along too — the project contains your edits, not the media.</p>
<h3>Is there a watermark or a time limit?</h3>
<p>No watermark and no time limit. Reelsmith is free.</p>
<h3>Are my videos uploaded?</h3>
<p>No. Everything happens on your phone.</p>
<p>Ready? Open <a href="/">reelsmithapp.com</a> on your phone and edit your next Short right there.</p>`;

await savePostScript({
  title: 'How to Edit a Video on Your Phone in the Browser (No App)',
  slug: 'edit-video-on-phone-in-browser',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-20T10:00:00+06:00'),
  excerpt: 'Edit a video on your phone without installing an app: trim, add text, music, effects and captions, then export a vertical video for Shorts, Reels or TikTok — free, no watermark.',
  metaTitle: 'Edit a Video on Your Phone in the Browser (Free)',
  metaDescription: 'Edit a video on your phone in the browser, no app needed: trim, add text, music and captions, and export for Shorts, Reels or TikTok — free, no watermark.',
  focusKeyword: 'edit a video on your phone', synonyms: 'phone video editor, mobile video editing, edit video on iPhone, edit video on Android, no app',
  keywords: 'edit video on phone, mobile video editor, iphone video editor, android video editor, no app, shorts, reels, tiktok, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Edit a video on your phone: Reelsmith phone layout with timeline, Effects sheet and Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
