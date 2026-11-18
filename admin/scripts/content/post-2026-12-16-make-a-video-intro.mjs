// Blog post, scheduled 2026-12-16 10:00 (Asia/Dhaka): "How to Make a Video Intro". Image: src/assets/shots/intro.jpg
// (scenes-blog.js "intro"). Features: Title Templates (Big Bold Intro, Elegant Title, Neon Sign, Countdown…), Text Styles, sfx Riser/Whoosh.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/intro.jpg';
const html = `<p>The first five seconds decide whether people keep watching. A good intro tells them what the video is and who made it — quickly, and in a style that fits. This guide shows how to make a video intro from a title template, your best shot and a sound, and how to save it so every video starts the same way. It's free in Reelsmith, an editor that runs in your browser, with no watermark and nothing uploaded.</p>
${fig(IMG, 'Make a video intro: an Elegant Title "THE ALPS" over a mountain sunrise, with the Title Templates list in the Effects panel', 'Elegant Title over the opening mountain shot, with a short music sting on A1. The Effects panel shows the title templates.')}
<h2>What makes a good video intro?</h2>
<ul><li><strong>Short.</strong> Three to six seconds. Viewers came for the video, not the intro.</li><li><strong>Your best shot.</strong> Open with the most striking picture you have — a teaser of what's coming.</li><li><strong>One clear title.</strong> The video's name, the channel name, or both.</li><li><strong>A sound that marks the start.</strong> A riser, a whoosh or the first beat of your music.</li></ul>
<p>Film and TV call this the <a href="https://en.wikipedia.org/wiki/Title_sequence" target="_blank" rel="noopener">title sequence</a>; for YouTube, a short version works far better than a long one.</p>
<h2>Step 1: Put your opening shot on the timeline</h2>
<p>Open <a href="/">the editor</a>, import your footage and drag the opening shot onto <strong>V1</strong> at the very start. Trim it to about five seconds. A slow push-in helps: drag <strong>Effects ▸ Blur &amp; Motion ▸ Slow Zoom In (Ken Burns)</strong> onto it.</p>
<h2>Step 2: Add a title template</h2>
<ol><li>Put the playhead at the start.</li><li>Open <strong>Effects ▸ Title Templates</strong> and double-click one. It lands on V2 above your shot, already animated.</li><li>Double-click the text in the Program monitor and type your title.</li></ol>
<p>Which template fits?</p>
<ul><li><strong>Big Bold Intro:</strong> energetic vlogs, gaming, sports.</li><li><strong>Elegant Title</strong> and <strong>Smooth Spaced Title:</strong> travel, weddings, calm documentaries.</li><li><strong>Neon Sign:</strong> night scenes, music, food at night.</li><li><strong>Retro Pop 3D Title</strong> and <strong>Epic 3D Title:</strong> bold, playful channels.</li><li><strong>Countdown 3-2-1:</strong> a fun lead-in to the reveal.</li><li><strong>Typewriter Text:</strong> stories and explainers.</li></ul>
${tip('Restyle any title in one click with Effects ▸ Text Styles, then fine-tune the font, size and colours in Effect Controls ▸ Text. More in our guide to animated text titles.')}
<h2>Step 3: Add a sound</h2>
<ol><li>Put a short piece of music on <strong>A1</strong> — the first seconds of your channel's theme, or a royalty-free track.</li><li>For extra punch, add <strong>Effects ▸ Sound Effects ▸ Riser</strong> leading up to the title and a <strong>Whoosh</strong> or <strong>Impact Boom</strong> when it appears.</li><li>Fade the music out at the end of the intro, or let it continue quietly under the video.</li></ol>
<h2>Step 4: Lead into the video</h2>
<p>End the intro with a cut on the beat into the first scene — or a quick transition such as <strong>Whip Pan</strong> or <strong>Flash</strong>. Keep it consistent across your videos; viewers learn to recognise it. For transitions, see <a href="/blog/how-to-add-transitions-between-video-clips/">how to add transitions between clips</a>.</p>
<h2>Step 5: Reuse your intro in every video</h2>
<ol><li>Build the intro once in its own project and save it.</li><li>Export it as a short MP4 with <strong>Export</strong>.</li><li>In each new project, import that file and drag it to the start of the timeline.</li></ol>
<p>Alternatively, start new videos from a project template on the start screen and adapt the intro there. For a logo that stays on screen after the intro, see <a href="/blog/add-logo-watermark-to-video/">how to add a logo to a video</a>.</p>
<h2>Intro ideas by type of channel</h2>
<ul><li><strong>Vlog:</strong> a two-second teaser of the best moment, then the title.</li><li><strong>Tutorial:</strong> show the finished result first, then "Here's how".</li><li><strong>Podcast:</strong> a quote from the episode with the episode title.</li><li><strong>Shorts and Reels:</strong> skip the branded intro — start with the hook. See <a href="/blog/editing-tips-for-short-videos/">editing tips for short videos</a>.</li></ul>
<h2>Frequently asked questions</h2>
<h3>How long should a YouTube intro be?</h3>
<p>As short as possible — usually three to six seconds, and under ten.</p>
<h3>Can I change the font?</h3>
<p>Yes. Select the title and choose another font in Effect Controls ▸ Text ▸ Font — from clean sans-serifs to Didot, Futura and Impact.</p>
<h3>Does the intro have a watermark?</h3>
<p>No. Reelsmith never adds a watermark to your exports.</p>
<h3>Is my video uploaded?</h3>
<p>No. Everything is made and exported on your device.</p>
<p>Ready? <a href="/">Open the editor</a> and make an intro people remember.</p>`;

await savePostScript({
  title: 'How to Make a Video Intro (Free, No Watermark)',
  slug: 'how-to-make-a-video-intro',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-16T10:00:00+06:00'),
  excerpt: 'Make a video intro in minutes: your best shot, an animated title template and a sound — short, on-brand and reusable for every video. Free in your browser, no watermark.',
  metaTitle: 'How to Make a Video Intro (Free, No Watermark)',
  metaDescription: 'Make a video intro: your best shot, an animated title template and a sound, kept short and reused in every video — free in your browser, with no watermark.',
  focusKeyword: 'make a video intro', synonyms: 'video intro, YouTube intro, intro maker, title sequence, channel intro',
  keywords: 'video intro, youtube intro, intro maker, title templates, animated title, channel intro, no watermark, free',
  category: 'tips',
  featuredImage: { src: IMG, alt: 'Make a video intro: Elegant Title over a mountain shot with the Title Templates list' },
  contentHtml: html, order: 99,
});
process.exit(0);
