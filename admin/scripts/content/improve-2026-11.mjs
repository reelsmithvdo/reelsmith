// One-off content pass (Nov 2026): deeper posts, featured images with real alt text, keyphrase synonyms,
// outbound sources and FAQs. Run: node --env-file=.env.local scripts/content/improve-2026-11.mjs
// It writes to the database named in MONGODB_DB (use reelsmith_dev locally) through savePost, so the
// HTML is cleaned and the SEO score recomputed exactly as when saving in the admin.
import { db } from '../../lib/db.js';
import { savePost } from '../../lib/posts.js';
import { seoReport } from '../../lib/score.js';

const fig = (src, alt, cap) => `<figure><img src="${src}" alt="${alt}"><figcaption>${cap}</figcaption></figure>`;
const tip = (html) => `<blockquote><p><strong>Tip:</strong> ${html}</p></blockquote>`;
const faq = (items) => `<h2>Frequently asked questions</h2>${items.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join('')}`;

const POSTS = {
  // ------------------------------------------------------------------ tutorials
  'add-subtitles-to-video-automatically': {
    metaTitle: 'Add Subtitles to Video Automatically, Free',
    metaDescription: 'Add subtitles to video automatically: captions are made from speech on your own device, then edited, styled and burned in or saved as .srt. Free, no upload.',
    excerpt: 'Generate captions from speech in your browser, edit them, and burn them into your video or export an .srt file — free and without uploading your video.',
    focusKeyword: 'add subtitles to video', synonyms: 'auto captions, subtitle generator, automatic subtitles',
    keywords: 'add subtitles to video, auto captions, subtitle generator, srt, burn in subtitles, free',
    featuredImage: { src: '/assets/shots/captions.jpg', alt: 'Reelsmith Captions panel listing auto-generated subtitles above the video timeline' },
    html: `<p>Want to add subtitles to video without typing every word? Reelsmith writes them for you from the speech in your video. The speech recognition runs on your own computer, so the audio is never uploaded — and it is free.</p>
<p>Captions make your videos easier to follow with the sound off, help viewers who are deaf or hard of hearing, and keep people watching longer. The <a href="https://www.w3.org/WAI/media/av/captions/" target="_blank" rel="noopener">W3C's guide to captions</a> explains why they matter for accessibility.</p>
<h2>What you need</h2>
<ul><li>A video with clear speech (or a separate voice-over track).</li><li>A recent version of Chrome, Edge, Safari or Firefox. Chrome and Edge are the fastest because they can use your graphics chip.</li></ul>
<h2>1. Put the video on the timeline</h2>
<p>Open <a href="/">the editor</a>, click <strong>New Project</strong> (or <strong>Start Editing</strong>) and drag your video onto the timeline. If the audio is on its own track, that works too — captions are made from everything you can hear.</p>
<h2>2. Generate the captions</h2>
<ol><li>Open the <strong>Captions</strong> tab in the bottom-left panel and click <strong>Auto-generate</strong>. You can also use <strong>Captions ▸ Auto-generate Captions…</strong> in the menu bar.</li><li>Choose what to transcribe: the <strong>Entire sequence</strong>, just the part between your In and Out points, or the selected clips.</li><li>Pick the <strong>spoken language</strong> — 21 languages are listed, including English, Spanish, Hindi, Bengali and Arabic — or leave <strong>Detect automatically</strong>.</li><li>Choose the accuracy. <strong>Base</strong> is a good balance; <strong>Tiny</strong> is fastest; <strong>Small</strong> is the most accurate for difficult audio and less common languages.</li><li>Click <strong>Generate</strong>.</li></ol>
<p>The first time, the caption engine downloads once (about 45–95 MB, depending on the model) and stays in your browser. After that it starts almost instantly.</p>
${fig('/assets/shots/captions.jpg', 'Captions panel with generated subtitles on the CC track', 'Generated captions appear in the Captions panel and on the CC track above the video.')}
${tip('Tick <strong>Translate the captions into English</strong> to get English subtitles from speech in another language.')}
<h2>3. Check and fix the words</h2>
<p>Speech recognition is good but not perfect — names, brands and technical words often need a correction.</p>
<ul><li>Click a caption in the <strong>Captions</strong> panel and edit its text.</li><li>Drag caption clips on the <strong>CC</strong> track to move them, or drag their edges to change how long they stay on screen.</li><li>Click <strong>Add at playhead</strong> to add a caption by hand.</li></ul>
<h2>4. Style the subtitles</h2>
<p>Click <strong>Style…</strong> in the Captions panel to change the text size, colour, background box, position and margin so the subtitles fit your video. For short vertical videos, larger text with a dark box is easiest to read on a phone.</p>
<h2>5. Export with subtitles</h2>
<p>Click <strong>Export</strong>. Under <strong>Captions</strong> choose:</p>
<ul><li><strong>Burn into the video</strong> — the subtitles become part of the picture (best for Instagram, TikTok and Shorts).</li><li><strong>Save as an .srt file only</strong> — upload it as a subtitle track on YouTube or Vimeo, where viewers can turn it on and off.</li><li><strong>Burn in and save an .srt file</strong> — both.</li></ul>
<p>You can also use <strong>Captions ▸ Export Captions (.srt)…</strong> at any time.</p>
<h2>Burned-in subtitles or an .srt file?</h2>
<p>Burned-in subtitles always show, look the same everywhere and survive re-uploads, which is why they suit short-form apps. An .srt file keeps the picture clean, lets viewers switch subtitles off, and can be indexed by video platforms. When in doubt, choose <strong>Burn in and save an .srt file</strong> and use whichever the platform needs.</p>
<h2>Tips for accurate automatic subtitles</h2>
<ul><li><strong>Clean the audio first.</strong> A <strong>High-Pass</strong> filter and <strong>Normalize Loudness…</strong> help the recognizer — see <a href="/tutorials/make-quiet-audio-louder/">how to make quiet audio louder</a>.</li><li><strong>Turn the music down</strong> while generating, or generate from the voice track only by selecting it.</li><li><strong>Pick the language</strong> instead of auto-detect when a video mixes languages.</li><li><strong>Use Small</strong> for accents, fast speech or noisy places.</li></ul>
<h2>Hide captions without deleting them</h2>
<p>Untick <strong>Show captions</strong> in the Captions panel (or click <strong>CC</strong> in the Program monitor). Hidden captions are left out of exports unless you choose <strong>Burn into the video</strong>.</p>
${faq([
  ['Is the automatic subtitle generator really free?', 'Yes. There is no account, no per-minute limit and no watermark. The speech model is open source and runs in your browser.'],
  ['Is my audio uploaded to make the captions?', 'No. The model is downloaded once to your browser and the transcription happens on your device. You can remove it later with <strong>Captions ▸ Remove Caption Engine…</strong>.'],
  ['Can I add subtitles to a video on my phone?', 'Yes — the editor works on phones and tablets. Generating captions is slower on a phone than on a computer, so start with the <strong>Tiny</strong> or <strong>Base</strong> model.'],
  ['Can I import an existing .srt file?', 'Yes. Choose <strong>Captions ▸ Import Captions (.srt)…</strong> or click <strong>Import .srt</strong> in the Captions panel, then edit and style them like generated ones. See <a href="/docs/captions/">Captions and subtitles</a>.'],
])}
<p>Next, make your subtitles part of a great short video: <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">how to make vertical videos for Shorts, Reels and TikTok</a>.</p>`,
  },

  'remove-video-background': {
    metaTitle: 'Remove Video Background Online (Free)',
    metaDescription: 'Remove video background colours — white, black or green screen — and make logos transparent in a free browser editor. Step by step, nothing uploaded.',
    focusKeyword: 'remove video background', synonyms: 'green screen, chroma key, transparent background',
    keywords: 'remove video background, green screen, chroma key, transparent logo, ultra key, free',
    featuredImage: { src: '/assets/shots/keying.jpg', alt: 'An overlay with its white background removed, showing the main video through it' },
    html: `<p>Overlay graphics are everywhere: a subscribe animation in the corner, a logo watermark, a green-screen clip of you over a new background. They usually come with a solid background that has to go. Here is how to remove video background colours in Reelsmith in a couple of clicks — free, in your browser.</p>
<h2>How it works</h2>
<p>Reelsmith removes a background <strong>by colour</strong>: everything close to the chosen colour becomes transparent, so the video on the track below shows through. This is the same idea as a film studio's green screen, known as <a href="https://en.wikipedia.org/wiki/Chroma_key" target="_blank" rel="noopener">chroma keying</a>. It works best when the background is one plain colour that doesn't appear in the subject.</p>
<h2>Remove a video background</h2>
<p>This works for animations on a <strong>white</strong>, <strong>black</strong> or <strong>green</strong> background, such as a like-and-subscribe clip.</p>
<ol><li>Put your main video on <strong>V1</strong>.</li><li>Put the overlay video on <strong>V2</strong>, directly above it.</li><li>Right-click the overlay clip ▸ <strong>Remove Background</strong>. (Or select it and click <strong>Remove Background</strong> in Effect Controls.)</li></ol>
<p>Reelsmith looks at the edges of the frame, detects the background colour and sets up the <strong>Ultra Key</strong> effect for you.</p>
${fig('/assets/shots/keying.jpg', 'An overlay with its white background removed over a main video', 'The white background of the overlay is removed, so the main video shows through.')}
<h3>Fine-tune it</h3>
<p>In <strong>Effect Controls ▸ Ultra Key</strong>:</p>
<ul><li><strong>Mode:</strong> <em>Brightness</em> for white, black or grey backgrounds; <em>Colour</em> for green or blue screens.</li><li><strong>Keep inside (edges only):</strong> removes only the background that touches the edges of the frame, so white text or icons inside the animation stay visible.</li><li><strong>Tolerance:</strong> raise it if a light fringe remains; lower it if parts of the animation disappear.</li><li><strong>Softness:</strong> smooths the edge.</li></ul>
<h3>Place and size it</h3>
<p>Use <strong>Effect Controls ▸ Motion</strong> — or drag the clip in the Program monitor — to scale it down and move it, for example to the bottom of the frame.</p>
<h2>Green screen: remove a green background from video</h2>
<ol><li>Put the new background (a photo or video) on <strong>V1</strong> and your green-screen clip on <strong>V2</strong>.</li><li>Right-click the green-screen clip ▸ <strong>Remove Background</strong>. Reelsmith picks the green and sets <strong>Mode</strong> to <em>Colour</em>.</li><li>Raise <strong>Tolerance</strong> until the last green patches disappear, then add a little <strong>Softness</strong> so hair and edges blend in.</li></ol>
${tip('Light the green screen evenly and stand a step away from it. Shadows and green light bouncing onto the subject are the usual causes of patchy results.')}
<h2>Remove a logo or image background</h2>
<ol><li>Import the logo.</li><li>Right-click it in the <strong>Project</strong> panel (or on the timeline) ▸ <strong>Remove Background…</strong></li><li>The preview shows transparent areas as a checkerboard. Click the preview to pick the background colour, or <strong>Shift+click</strong> to add more colours for gradients.</li><li>Choose <strong>Background touching the edges</strong> to keep white parts inside the logo, or <strong>This colour everywhere</strong> to also clear the holes in letters like O, A and e.</li><li>Adjust <strong>Tolerance</strong> and <strong>Edge softness</strong>, tick <strong>Trim transparent edges</strong> if you like, and click <strong>Remove Background</strong>.</li></ol>
<p>A new transparent PNG is added to the Project panel and your clip switches to it. The original stays untouched.</p>
<h2>Fixing common problems</h2>
<ul><li><strong>A thin white or green outline stays:</strong> raise Tolerance a little, then add Softness.</li><li><strong>Parts of the subject vanish:</strong> lower Tolerance, or tick <strong>Keep inside (edges only)</strong> so only the outer background is removed.</li><li><strong>The background is a gradient:</strong> for images, Shift+click several colours in the preview.</li><li><strong>The background changes colour in the video:</strong> colour removal needs a steady colour; use a mask instead (below).</li></ul>
<h2>When colour removal isn't enough</h2>
<p>Background removal works by colour, so it's best for graphics and screens with a plain background. To cut out a person in an everyday photo or video, draw a <a href="/docs/masks/">mask</a> around them and use <a href="/docs/tracking/">mask tracking</a> to follow the movement.</p>
${tip('Need a subscribe button and don\'t have one? The <strong>Library</strong> tab has animated buttons with transparent backgrounds already — see <a href="/tutorials/add-subscribe-button-to-video/">Add an animated subscribe button</a>.')}
${faq([
  ['Can I remove a video background without a green screen?', 'Yes, if the background is a plain colour such as white or black. For busy, real-world backgrounds, use a mask with tracking instead.'],
  ['Is my video uploaded?', 'No. The effect runs on your computer\'s graphics chip while you edit and export.'],
  ['Does the transparent part export as transparent?', 'The transparent area shows the tracks below it, and the exported MP4 contains the combined picture. MP4 itself has no transparency.'],
])}
<p>More detail: <a href="/docs/ultra-key/">Green screen (Ultra Key)</a> and <a href="/docs/remove-background/">Remove an image background</a>.</p>`,
  },

  'vertical-video-for-shorts-reels-tiktok': {
    metaTitle: 'Make a Vertical Video for Shorts, Reels, TikTok',
    metaDescription: 'Make a vertical video in 9:16 for Shorts, Reels and TikTok: reframe landscape clips, fill the frame, add captions and export 1080×1920 — free in your browser.',
    focusKeyword: 'vertical video', synonyms: '9:16 video, shorts, reels, tiktok video',
    keywords: 'vertical video, 9:16, youtube shorts, instagram reels, tiktok, 1080x1920, free video editor',
    featuredImage: { src: '/assets/shots/vertical.jpg', alt: 'Editing a vertical 9:16 video with a headline and captions in Reelsmith' },
    html: `<p>Short-form platforms expect a <strong>vertical video in 9:16 at 1080×1920</strong>. Here is how to make one in Reelsmith, whether you filmed vertically or horizontally — free, in your browser, with nothing uploaded.</p>
<h2>The right vertical video size</h2>
<p>YouTube Shorts, Instagram Reels and TikTok all play full-screen vertical video. Use <strong>1080×1920 pixels (9:16)</strong>, keep it under a minute if you are unsure, and export as MP4. YouTube lists its current limits in <a href="https://support.google.com/youtube/answer/12779649" target="_blank" rel="noopener">Upload YouTube Shorts</a>.</p>
<h2>If you filmed vertically</h2>
<p>Start a project and drop in your phone clip. In a new sequence, <strong>the first video you add sets the frame size</strong> — a vertical clip makes a 9:16 sequence automatically. A message confirms it, and ⌘Z (Ctrl+Z on Windows) undoes it.</p>
<h2>If you filmed horizontally</h2>
<ol><li>Choose <strong>Sequence ▸ Sequence Settings…</strong> and pick the <strong>Vertical 9:16 (1080×1920)</strong> preset.</li><li>Add your landscape clip. It sits in the middle with empty space above and below.</li><li>Select the clip and open <strong>Effect Controls ▸ Motion</strong>. Raise <strong>Scale</strong> until the picture fills the height, then drag it left or right in the Program monitor to frame your subject.</li></ol>
${tip('If your subject moves around, add <strong>Position</strong> keyframes so the frame follows them. See <a href="/docs/effect-controls/">Effect Controls and keyframes</a>.')}
<h3>Or keep the whole picture with a blurred background</h3>
<p>Don't want to crop? Apply <strong>Effects ▸ Creative Effects ▸ Background Blur Fill</strong>. The full landscape picture stays in the middle and the empty space above and below is filled with a blurred copy — a popular look for reposting horizontal clips.</p>
${fig('/assets/shots/vertical.jpg', 'A vertical 9:16 sequence in the editor', 'A 9:16 sequence with a title and captions.')}
<h2>Make your vertical video work without sound</h2>
<p>Most people scroll with the sound off, so text matters:</p>
<ul><li><strong>Auto captions:</strong> <strong>Captions ▸ Auto-generate Captions…</strong> writes subtitles from your speech — see <a href="/tutorials/add-subtitles-to-video-automatically/">How to add subtitles automatically</a>.</li><li><strong>A hook in the first second:</strong> press <code>T</code>, click the video and type a short headline. Then try a style from <strong>Effects ▸ Text Styles</strong> and an animation such as <strong>Words Pop</strong> from <strong>Effects ▸ Animations — In</strong>.</li><li><strong>Keep text in the middle:</strong> the top and bottom of the screen are often covered by the app's buttons and captions. Click <strong>Safe</strong> in the Program monitor to show safe margins.</li></ul>
<h2>Keep it moving</h2>
<ul><li>Cut out pauses with the razor tool (<code>C</code>), then delete the gaps (see <a href="/docs/delete-gaps/">Deleting clips and closing gaps</a>) so the video never stalls.</li><li>Use quick transitions like <strong>Whip Pan</strong>, <strong>Zoom In</strong> or <strong>Flash</strong> between scenes, and the <strong>Zoom Punch (beat)</strong> effect from <strong>Effects ▸ Creative Effects</strong> for emphasis.</li><li>Add a sound effect (<strong>Effects ▸ Sound Effects</strong>) on key moments.</li></ul>
<p>For more ideas, read <a href="/blog/editing-tips-for-short-videos/">7 editing tips that make short videos easier to watch</a>.</p>
<h2>Export at the right size</h2>
<p>Click <strong>Export</strong> and choose the <strong>YouTube Shorts / Reels / TikTok (9:16)</strong> preset — 1080×1920 H.264 MP4. If your sequence is already vertical, <strong>Match Source</strong> gives the same result. Then upload the file from your phone or computer.</p>
${faq([
  ['What aspect ratio is a vertical video?', '9:16 — nine units wide for every sixteen tall. 1080×1920 pixels is the standard size for Shorts, Reels and TikTok.'],
  ['Can I make a vertical video from a horizontal one?', 'Yes. Switch the sequence to the <strong>Vertical 9:16 (1080×1920)</strong> preset, then either scale the clip up to fill the frame or use <strong>Background Blur Fill</strong> to keep the whole picture.'],
  ['Can I edit vertical videos on my phone?', 'Yes. Reelsmith works in mobile browsers with touch gestures, so you can edit and export on the same phone you filmed with.'],
  ['Will the export have a watermark?', 'No. Exports are free and never watermarked.'],
])}`,
  },

  'animated-text-titles': {
    metaTitle: 'Animated Text and 3D Titles for Video (Free)',
    metaDescription: 'Make animated text for video in your browser: title templates, 3D and gradient styles, word-by-word animation and tips for readable titles. Free, no watermark.',
    focusKeyword: 'animated text', synonyms: 'text animation, 3d title, title templates, kinetic text',
    keywords: 'animated text, text animation, 3d title, title templates, kinetic typography, free video editor',
    featuredImage: { src: '/assets/shots/titles.jpg', alt: 'A Retro Pop 3D title with a gradient fill in the Program monitor' },
    html: `<p>A good title grabs attention in the first second. Reelsmith gives you three ways to make animated text for your videos: start from a template, apply a one-click style, or build your own look with text effects and animations. Everything runs in your browser, free.</p>
<h2>The fastest way: a title template</h2>
<p>Open <strong>Effects ▸ Title Templates</strong> and double-click one — for example <strong>Retro Pop 3D Title</strong>, <strong>Epic 3D Title</strong>, <strong>Kinetic Words</strong> or <strong>Bouncy Words</strong>. It's added at the playhead, sized for your frame. Double-click the text in the Program monitor to type your own words.</p>
<p>Other templates cover everyday needs: <strong>Lower Third</strong> for names, <strong>Chapter Title</strong>, <strong>Countdown 3-2-1</strong>, <strong>Call to Action</strong> and <strong>Breaking News Bar</strong>.</p>
${fig('/assets/shots/titles.jpg', 'A 3D title with a gradient fill in the Program monitor', 'A Retro Pop 3D title, ready to edit.')}
<h2>Type your own title</h2>
<ol><li>Press <code>T</code> for the <strong>Type tool</strong>.</li><li>Click in the Program monitor and type. Press ⌘Enter (Ctrl+Enter on Windows) or click outside to finish.</li><li>Drag the text to move it; drag the corner handles to resize.</li><li>Set the font, size, colour, outline, shadow and background box in <strong>Effect Controls ▸ Text</strong>.</li></ol>
<h2>One-click text styles</h2>
<p>With the title selected, double-click a style in <strong>Effects ▸ Text Styles</strong>: <strong>Retro Pop 3D</strong>, <strong>Epic Gold 3D</strong>, <strong>Gradient Bold</strong>, <strong>Two-Tone</strong>, <strong>Sticker Outline</strong>, <strong>Candy 3D</strong>, <strong>Gold Luxe</strong>, <strong>Comic Burst 3D</strong>, Neon, Elegant and more. Applying a new style replaces the old one, so you can try several quickly.</p>
<h2>Build your own 3D or gradient look</h2>
<p><strong>Effect Controls ▸ Text Effects</strong> has:</p>
<ul><li><strong>Gradient fill</strong> with two colours and an angle.</li><li><strong>3D extrude</strong> with depth, direction and side colour.</li><li><strong>Highlight words:</strong> wrap a word in asterisks — <code>Make it *pop*</code> — and it takes the highlight colour.</li><li><strong>Halftone dots</strong>, <strong>outer outline</strong>, <strong>offset shadow</strong>, <strong>glow</strong> and <strong>letter spacing</strong>.</li></ul>
<h2>Animate the text</h2>
<p>Drag an animation from <strong>Effects ▸ Animations</strong> onto the title:</p>
<ul><li><strong>In:</strong> Pop, Zoom, Slide, Fade Up, Blur In, Bounce, Stamp, <strong>Typewriter</strong>, and text-only <strong>Words Pop</strong>, <strong>Words Rise</strong>, <strong>Letters Drop</strong> and more.</li><li><strong>Out:</strong> the same moves in reverse, plus <strong>Erase</strong>.</li><li><strong>Loop:</strong> Pulse, Float, Wobble, <strong>Letter Wave</strong> or <strong>Word Bounce</strong> while the title is on screen.</li></ul>
<p>Each title has one In, one Out and one Loop animation. Set their duration, speed and strength in <strong>Effect Controls ▸ Animation</strong>.</p>
<h2>Which text animation to use</h2>
<ul><li><strong>Hooks for Shorts and Reels:</strong> Words Pop or Bouncy Words — fast and energetic.</li><li><strong>Vlogs and travel:</strong> Fade Up or Typewriter with an Elegant Serif style.</li><li><strong>Tutorials and interviews:</strong> a Lower Third with a gentle Slide In.</li><li><strong>Calls to action:</strong> Pop In plus a Pulse loop so it gets noticed without distracting.</li></ul>
<h2>Tips for titles that read well</h2>
<ul><li>Keep it short — three to six words.</li><li>Use strong contrast: a light fill with a dark outline or shadow is readable on any background. The <a href="https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html" target="_blank" rel="noopener">W3C contrast guideline</a> explains how much contrast text needs.</li><li>Leave a little space at the edges; click <strong>Safe</strong> in the Program monitor to see the safe zone.</li><li>Give viewers time to read: about one second per three words, plus the animation.</li></ul>
${faq([
  ['Can I make animated text without After Effects?', 'Yes. Title templates, text styles and the In, Out and Loop animations cover the most popular looks with no keyframes needed.'],
  ['Can I use my own font?', 'The Font list in Effect Controls shows the fonts available in your browser and on your computer.'],
  ['Do animated titles work in vertical videos?', 'Yes. Templates are sized for the current frame, including 9:16. See <a href="/tutorials/vertical-video-for-shorts-reels-tiktok/">how to make vertical videos</a>.'],
])}
<p>More detail: <a href="/docs/titles/">Titles</a> and <a href="/docs/text-effects/">3D, gradient, halftone and animated text</a>.</p>`,
  },

  'make-quiet-audio-louder': {
    metaTitle: 'Make Audio Louder in a Video (Free, Online)',
    metaDescription: 'Make audio louder in a video: boost quiet speech, normalize loudness to −14 LUFS, even out loud and quiet parts and remove noise — free, in your browser.',
    focusKeyword: 'make audio louder', synonyms: 'increase volume, boost audio, normalize loudness, louder video',
    keywords: 'make audio louder, increase video volume, boost audio, normalize loudness, LUFS, compressor, noise',
    featuredImage: { src: '/assets/shots/audio.jpg', alt: 'Effect Controls with Volume raised to 180% and a Compressor on a speech clip, music on a second track' },
    html: `<p>A great shot with sound you can barely hear is a common problem with phone and camera footage. Here is how to make audio louder in a video with Reelsmith, from the quickest fix to a polished, even result — free, in your browser.</p>
${fig('/assets/shots/audio.jpg', 'Effect Controls showing Volume at 180 percent and a Compressor on a speech clip', 'Volume raised to 180 % with a Compressor on the speech track; music sits on its own track below.')}
<h2>Quick fix: raise the volume</h2>
<ol><li>Click the clip on the timeline.</li><li>In <strong>Effect Controls ▸ Audio</strong>, raise <strong>Volume</strong>. 100 % is the original level; you can go up to 300 %.</li><li>Play it back and watch the <strong>meters</strong> on the right of the timeline. Keep the peaks below 0 dB — if the top of the meter turns red, the sound is close to distorting.</li></ol>
<p>Prefer exact numbers? Select the clip and press <code>G</code> for <strong>Clip ▸ Audio Gain…</strong> to add or remove decibels. +6 dB is roughly twice as loud to the ear.</p>
<h2>Better: normalize the loudness</h2>
<p>Different clips are often recorded at different levels. Select them and choose <strong>Clip ▸ Normalize Loudness…</strong>, then pick a target:</p>
<ul><li><strong>−14 LUFS</strong> — YouTube, Spotify and most online video.</li><li><strong>−16 LUFS</strong> — Apple Podcasts and Apple Music.</li><li><strong>−23 LUFS</strong> — European broadcast (<a href="https://en.wikipedia.org/wiki/EBU_R_128" target="_blank" rel="noopener">EBU R 128</a>).</li><li><strong>−24 LUFS</strong> — US broadcast.</li></ul>
<p>Reelsmith measures each clip with the standard broadcast method and sets its Audio Gain, so every clip has the same perceived loudness and viewers don't have to keep reaching for the volume.</p>
<h2>Even out loud and quiet parts</h2>
<p>If some words are loud and others quiet, drag <strong>Effects ▸ Audio Effects ▸ Compressor</strong> onto the clip. It turns down the loudest moments so you can raise the overall level without distortion. Use <strong>Make-up gain</strong> to bring it back up.</p>
${tip('Order matters: compress first, then normalize. The compressor evens out the speech, and normalizing sets the final level.')}
<h2>Clean up the sound</h2>
<p>Making audio louder also makes the noise louder, so clean it up. In <strong>Effects ▸ Audio Effects</strong>:</p>
<ul><li><strong>High-Pass</strong> removes rumble from traffic, wind and handling noise (80 Hz is a good start for voices).</li><li><strong>DeHum</strong> removes the 50 or 60 Hz buzz from electrical equipment.</li><li><strong>Noise Gate</strong> silences the hiss between words.</li><li><strong>Parametric EQ</strong> — lift the highs a little for clearer speech, or cut the lows to reduce boominess.</li></ul>
<h2>Work on the audio separately</h2>
<p>Video and audio from the same file are linked, so they move together. To edit the sound on its own — for example to boost it, move it, or delete it — select the clip and press ⌘L (Ctrl+L on Windows), or right-click ▸ <strong>Unlink</strong>. You don't need to unlink just to change the volume, though: selecting the clip is enough.</p>
${tip('Recording a narration? Click the <strong>mic</strong> button on an audio track to record a voice-over straight into the timeline.')}
<h2>Music under speech</h2>
<p>Put background music on its own track, select it and apply <strong>Effects ▸ Smart Audio ▸ Auto Duck Music Under Voice</strong>. The music dips by 14 dB automatically whenever someone speaks, with smooth fades you can adjust.</p>
<h2>A quick recipe for clear, loud speech</h2>
<ol><li>Unlink the audio if you want to work on it alone (⌘L).</li><li>Add <strong>High-Pass</strong> at 80 Hz and, if you hear a buzz, <strong>DeHum</strong>.</li><li>Add a <strong>Compressor</strong>.</li><li>Run <strong>Normalize Loudness…</strong> at −14 LUFS.</li><li>Duck the music with <strong>Auto Duck Music Under Voice</strong>.</li></ol>
${faq([
  ['How do I increase the volume of a video beyond 100%?', 'Raise <strong>Volume</strong> up to 300 % in Effect Controls, or add decibels with <strong>Audio Gain…</strong> (G). Watch the meters so the peaks stay below 0 dB.'],
  ['Why does my audio distort when I make it louder?', 'The loudest moments are hitting the limit. Add a Compressor first, then raise the level, or lower the gain until the meters stop turning red.'],
  ['What loudness should I use for YouTube?', '−14 LUFS. YouTube turns louder videos down to about this level anyway, so going louder only adds distortion.'],
  ['Is my audio uploaded?', 'No. All processing happens in your browser on your own computer.'],
])}
<p>More detail: <a href="/docs/audio/">Working with audio</a>, <a href="/docs/audio-effects/">Audio effects</a> and <a href="/docs/unlink/">Detaching audio from video</a>. Clean audio also makes <a href="/tutorials/add-subtitles-to-video-automatically/">automatic subtitles</a> more accurate.</p>`,
  },

  'add-subscribe-button-to-video': {
    metaTitle: 'Add an Animated Subscribe Button to Video',
    metaDescription: 'Add an animated subscribe button to your video with a transparent background and click-and-bell sound. Change the text and colours — free, in your browser.',
    focusKeyword: 'subscribe button', synonyms: 'subscribe animation, like and subscribe, notification bell',
    keywords: 'subscribe button, subscribe animation, like and subscribe, bell icon, youtube, free, transparent',
    featuredImage: { src: '/assets/shots/library.jpg', alt: 'The Library panel with animated subscribe, like and bell buttons' },
  },

  // ------------------------------------------------------------------ blog
  'editing-tips-for-short-videos': {
    metaTitle: '7 Editing Tips for Short Videos That Keep Viewers',
    metaDescription: 'Seven editing tips for short videos on Shorts, Reels and TikTok: strong hooks, tight cuts, captions, on-screen text, pacing, clean sound and vertical framing.',
    focusKeyword: 'editing tips', synonyms: 'short video editing, video editing tips, shorts editing',
    keywords: 'editing tips, short video, youtube shorts, reels, tiktok, video editing for beginners',
    featuredImage: { src: '/assets/shots/effects.jpg', alt: 'Applying the Zoom Punch effect to a clip, with the Effects panel searched for zoom' },
  },
  'introducing-reelsmith': {
    metaTitle: 'Introducing Reelsmith, a Free Video Editor',
    metaDescription: 'Reelsmith is a free video editor that runs in your browser: a multi-track timeline, titles, color, audio tools and auto captions, with no upload or watermark.',
    focusKeyword: 'free video editor', synonyms: 'online video editor, browser video editor, video editor',
    keywords: 'free video editor, online video editor, browser, no watermark, no upload',
    featuredImage: { src: '/assets/shots/editor.jpg', alt: 'The Reelsmith editor with video, title and caption tracks on the timeline' },
  },
  'private-video-editing-in-the-browser': {
    metaTitle: 'Private Video Editing in the Browser',
    metaDescription: 'How video editing in the browser keeps your files private: Reelsmith edits, captions and exports on your own computer with WebCodecs, so nothing is uploaded.',
    focusKeyword: 'video editing in the browser', synonyms: 'private video editor, offline video editing, no upload video editor',
    keywords: 'video editing in the browser, private, no upload, webcodecs, local, offline',
    featuredImage: { src: '/assets/shots/privacy.jpg', alt: 'The Reelsmith start screen: open videos from your computer, files stay on your device' },
  },
};

// Additions for posts whose existing body is kept (new sections appended or inserted).
const ADD = {
  'add-subscribe-button-to-video': (h) => h
    .replace('<p>A short &quot;subscribe&quot; reminder', '<p>An animated subscribe button near the start or end of a video is a simple way to grow a channel. A short &quot;subscribe&quot; reminder')
    .replace(/<aside class="tip">([\s\S]*?)<\/aside>/g, (m, t) => tip(t.replace(/^Tip:\s*/, '')))
    + `<h2>Where to put the subscribe button</h2>
<ul><li><strong>Bottom third, left or right:</strong> clear of faces and of the platform's own buttons. Click <strong>Safe</strong> in the Program monitor to see the safe zone.</li><li><strong>Vertical videos:</strong> keep it above the bottom quarter, where Shorts and Reels show captions and controls.</li><li><strong>The last 20 seconds of a YouTube video</strong> are usually covered by YouTube's own <a href="https://support.google.com/youtube/answer/6388789" target="_blank" rel="noopener">end screens</a>; show your button before that.</li></ul>
<h2>Make it match your channel</h2>
<p>Change the colours in <strong>Effect Controls ▸ Graphic</strong> to your brand colours and the text to your call to action — <em>FOLLOW</em>, <em>JOIN</em> or a word in your viewers' language. Pair it with a title in the same colours; see <a href="/tutorials/animated-text-titles/">how to make animated text and 3D titles</a>.</p>
<h2>Using your own subscribe animation</h2>
<p>Have a subscribe clip on a green, white or black background? Put it on V2 and right-click ▸ <strong>Remove Background</strong>. The full steps are in <a href="/tutorials/remove-video-background/">how to remove a video background</a>.</p>
${faq([
  ['Is the subscribe button free to use?', 'Yes. The Library graphics and sounds are original to Reelsmith and free to use in your videos, including monetized ones.'],
  ['Does it work for TikTok and Instagram?', 'Yes. Change the text to FOLLOW and use the <strong>Follow Button</strong> or <strong>Share Button</strong> graphics.'],
  ['How long should the subscribe button stay on screen?', '3–5 seconds is enough: long enough to notice, short enough not to annoy.'],
])}`,

  'editing-tips-for-short-videos': (h) => h
    .replace('<p>Short videos live or die in the first few seconds. These seven habits make a noticeable difference, and each one takes less than a minute in Reelsmith.</p>',
      `<p>Short videos live or die in the first few seconds. These seven editing tips make a noticeable difference on YouTube Shorts, Instagram Reels and TikTok, and each one takes less than a minute in Reelsmith, the free editor that runs in your browser.</p>
${fig('/assets/shots/effects.jpg', 'Zoom Punch applied to a clip, with the Effects panel filtered by zoom', 'Search the Effects panel to find effects like Zoom Punch fast.')}`)
    .replace('<h2 id="2-cut-every-pause">2. Cut every pause</h2>\n<p>Silences that feel natural in conversation feel slow on screen. Play through, split at the start and end of each pause, and delete the gap.',
      '<h2 id="2-cut-every-pause">2. Cut every pause</h2>\n<p>Silences that feel natural in conversation feel slow on screen. Play through, split at the start and end of each pause with <strong>Clip ▸ Split at Playhead</strong> (⌘K), and remove the piece with <strong>Ripple Delete</strong> (⇧Delete) so the gap closes. Fast cuts like this are called <a href="https://en.wikipedia.org/wiki/Jump_cut" target="_blank" rel="noopener">jump cuts</a> and are normal in short-form video.')
    .replace('<p>Put these together and even a simple phone clip feels intentional.',
      `<h2>Bonus editing tips: speed, freeze and reverse</h2>
<ul><li><strong>Speed up the boring part:</strong> select a clip and use <strong>Clip ▸ Speed/Duration…</strong> (⌘R) — 200 % for travel, 400 % for a quick time-lapse.</li><li><strong>Freeze the big moment:</strong> <strong>Clip ▸ Add Frame Hold</strong> stops the picture on the playhead frame — great with a sound effect and a title.</li><li><strong>Rewind for effect:</strong> <strong>Clip ▸ Reverse Clip</strong> plays a moment backwards.</li></ul>
<h2>A 60-second checklist before you export</h2>
<ol><li>Does the first second show the payoff or ask a question?</li><li>Are there any pauses left?</li><li>Can you follow it with the sound off?</li><li>Is the audio even, with music under the voice?</li><li>Are faces and text inside the safe zone?</li></ol>
${faq([
  ['How long should a short video be?', 'As short as the idea allows. Many successful Shorts and Reels are 15–30 seconds; cutting every pause usually takes a video under a minute.'],
  ['What is the best free editor for short videos?', 'Any editor with a timeline, captions and 9:16 export will do. Reelsmith adds auto captions and vertical presets for free, with no watermark, in the browser.'],
  ['Should I add music to every short?', 'Not always. Music helps montages; for talking videos, keep it quiet or duck it under the voice.'],
])}
<p>Put these together and even a simple phone clip feels intentional.`),

  'introducing-reelsmith': (h) => h
    .replace('<p>Most online video editors fall into one of two camps.', '<p>Reelsmith is a free video editor that runs in your browser. Most online video editors fall into one of two camps.')
    .replace('<h2 id="nothing-to-upload">Nothing to upload</h2>',
      `${fig('/assets/shots/editor.jpg', 'The Reelsmith editor with a title, three video clips and a caption track', 'A real timeline: video, audio, titles and captions on separate tracks.')}
<h2>Who this free video editor is for</h2>
<ul><li><strong>Creators</strong> making Shorts, Reels, TikToks and YouTube videos who want captions and titles without a subscription.</li><li><strong>Students and teachers</strong> on school laptops or Chromebooks where installing software isn't allowed.</li><li><strong>Small businesses</strong> editing product videos and ads that shouldn't be uploaded to unknown servers.</li><li><strong>Editors</strong> who know Premiere-style tools and want the same workflow anywhere.</li></ul>
<h2 id="nothing-to-upload">Nothing to upload</h2>`)
    .replace('<h2 id="free-without-the-catch">Free, without the catch</h2>',
      `<h2>Works on computers, tablets and phones</h2>
<p>The same editor adapts to touch screens with gestures and bottom-sheet panels, so you can start a project on a laptop and make a quick fix on a tablet. Chrome and Edge give the best performance; Safari and Firefox work too.</p>
<h2 id="free-without-the-catch">Free, without the catch</h2>`)
    + faq([
      ['Is Reelsmith really free?', 'Yes. There is no account, no trial and no watermark. The site will be supported by ads that never cover the editor.'],
      ['Do I need to install anything?', 'No. Open <a href="/">reelsmithapp.com</a> in your browser and start editing.'],
      ['Can it export 4K?', 'Yes, MP4 or WebM up to 4K, with presets for YouTube, Shorts, Reels, TikTok and Instagram. See <a href="/docs/export/">Exporting a video</a>.'],
    ]),

  'private-video-editing-in-the-browser': (h) => h
    .replace('<p>&quot;Online video editor&quot; usually means', `<p>Video editing in the browser usually means uploading. &quot;Online video editor&quot; usually means`)
    .replace('<ul><li><strong>Hardware video decoding and encoding</strong> (WebCodecs)', '<ul><li><strong>Hardware video decoding and encoding</strong> (<a href="https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API" target="_blank" rel="noopener">WebCodecs</a>)')
    .replace('your browser downloads an open-source speech model (Whisper) once', 'your browser downloads an open-source speech model (<a href="https://github.com/openai/whisper" target="_blank" rel="noopener">Whisper</a>) once')
    .replace('<h2 id="what-this-means-for-you">What this means for you</h2>',
      `${fig('/assets/shots/privacy.jpg', 'The Reelsmith start screen with Open From Computer and a drop zone', 'Files are opened from your computer; nothing is sent to a server.')}
<h2 id="what-this-means-for-you">What video editing in the browser means for you</h2>`)
    .replace('<p>Ready to try it?',
      `<h2>How to check that nothing is uploaded</h2>
<p>You don't have to take our word for it. Open your browser's developer tools (F12 in Chrome or Edge), choose the <strong>Network</strong> tab, then import and export a video. You'll see the page and its code load — but no request that carries your video. You can even disconnect from the internet after the page has loaded and keep editing.</p>
${faq([
  ['Can I edit videos offline?', 'Once the page has loaded, editing and exporting work without a connection. Auto captions need the internet only the first time, to download the speech model.'],
  ['Where are my projects saved?', 'In your browser\'s storage on your computer. Use <strong>File ▸ Download Project File</strong> to keep a backup or move a project to another machine.'],
  ['Does Reelsmith use my videos for AI training?', 'No. Your videos never leave your device, so there is nothing to train on.'],
])}
<p>Ready to try it?`),
};

const d = await db();
const user = { email: 'content-script' };
const others = (await d.collection('posts').find({}, { projection: { focusKeyword: 1, slug: 1, title: 1 } }).toArray());
for (const [slug, c] of Object.entries(POSTS)) {
  const prev = await d.collection('posts').findOne({ slug });
  if (!prev) { console.log('MISSING', slug); continue; }
  let html = c.html || prev.contentHtml;
  if (ADD[slug]) html = ADD[slug](prev.contentHtml);
  html = html.replace(/<aside class="tip">([\s\S]*?)<\/aside>/g, (m, t) => tip(t.replace(/^(<strong>)?Tip:(<\/strong>)?\s*/, '')));
  const input = {
    title: prev.title, slug: prev.slug, section: prev.section, status: 'published', publishAt: prev.publishAt,
    excerpt: c.excerpt ?? prev.excerpt, metaTitle: c.metaTitle, metaDescription: c.metaDescription,
    focusKeyword: c.focusKeyword, synonyms: c.synonyms, keywords: c.keywords, category: prev.category,
    featuredImage: c.featuredImage, contentHtml: html, order: prev.order,
  };
  const before = prev.seoScore;
  await savePost(String(prev._id), input, user);
  const now = await d.collection('posts').findOne({ slug });
  const r = seoReport(now, others.filter((o) => o.slug !== slug && o.focusKeyword).map((o) => ({ title: o.title, focusKeyphrase: o.focusKeyword })));
  const bad = [...r.seo, ...r.read].filter((x) => x.status !== 'good').map((x) => x.label + ': ' + x.text);
  console.log(`${slug}: ${before} → ${now.seoScore} (${r.words} words)\n   ` + bad.join('\n   '));
}
process.exit(0);
