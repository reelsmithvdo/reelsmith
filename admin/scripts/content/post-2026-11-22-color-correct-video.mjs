// Blog post, scheduled 2026-11-22 10:00 (Asia/Dhaka): "How to Color Correct a Video". Image: src/assets/shots/color.jpg
// (scripts/shots/scenes-blog.js "color"). Controls follow inspector.js lumetriSection() and the Lumetri Scopes panel.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/color.jpg';
const html = `<p>Phone and camera footage often comes out a little flat, too blue or too dark. This guide shows how to color correct a video in a few minutes: fix the white balance, set the exposure and contrast, bring back colour, and keep every clip in a scene looking the same. You'll use Lumetri Color in Reelsmith, a free editor that runs in your browser, so your footage is never uploaded.</p>
<p>Color correction is not the same as a "look". First you make the picture natural and consistent; only then, if you like, you add a style on top.</p>
${fig(IMG, 'Color correct a video: Lumetri Color Basic Correction with temperature, contrast, highlights and saturation on a road-trip clip', 'Lumetri Color ▸ Basic Correction on a flat, misty road-trip shot: a little warmer, highlights down, more contrast and colour.')}
<h2>Before you color correct a video</h2>
<ul><li><strong>Correct one clip at a time.</strong> Each shot was lit differently, so each needs its own settings.</li><li><strong>Watch the scopes, not just the picture.</strong> Screens differ in brightness; the <strong>Lumetri Scopes</strong> tab measures the image instead.</li><li><strong>Work in order:</strong> white balance, then exposure and contrast, then saturation. Each step changes how the next one looks.</li></ul>
<h2>Step 1: Open Lumetri Color</h2>
<ol><li>Open <a href="/">the editor</a>, click <strong>Import</strong> and drag your clips onto the timeline.</li><li>Click the first clip to select it.</li><li>In <strong>Effect Controls</strong>, open the <strong>Lumetri Color</strong> section. Its first part, <strong>Basic Correction</strong>, has everything this guide needs.</li></ol>
<h2>Step 2: Fix the white balance</h2>
<p>White balance decides whether white looks white. Footage shot indoors often looks orange, and shade or cloudy days look blue.</p>
<ul><li><strong>Temperature</strong> moves the picture from cooler (blue) to warmer (orange). If the clip looks cold, move it right; if it looks yellow, move it left.</li><li><strong>Tint</strong> fixes a green or magenta cast, which fluorescent lights often cause.</li></ul>
<p>Look at something that should be neutral, such as a white wall, a grey road or a cloud. When it stops looking tinted, the white balance is right.</p>
<h2>Step 3: Set exposure and contrast</h2>
<ol><li><strong>Exposure</strong> brightens or darkens the whole picture, in stops. Small steps go a long way, so try 0.2 or 0.3 first.</li><li><strong>Contrast</strong> makes darks darker and brights brighter. Flat footage usually needs a little more.</li><li><strong>Highlights</strong> brings back detail in bright areas, such as a sky; pull it down if the clouds look like white paper.</li><li><strong>Shadows</strong> opens up dark areas without making the whole image grey.</li><li><strong>Whites</strong> and <strong>Blacks</strong> set the brightest and darkest points. A slightly lower Blacks value adds depth.</li></ol>
${tip('Open the Lumetri Scopes tab while you adjust. The waveform should spread from near the bottom to near the top without being cut off at either end.')}
<h2>Step 4: Bring back the colour</h2>
<p>Next, raise <strong>Saturation</strong> a little, to about 105–120%, if the clip still looks dull. Watch skin tones: when faces turn orange, you've gone too far. In contrast, lowering saturation calms down a busy, colourful scene; 0% makes it black and white.</p>
<h2>Step 5: Fine-tune with curves and color wheels</h2>
<ul><li><strong>Curves:</strong> click the master curve to add a point and drag it. A gentle S-shape adds contrast; raising the middle brightens mid-tones only. The Red, Green and Blue curves fix a colour cast in one range.</li><li><strong>Color Wheels:</strong> drag the centre dot of <strong>Shadows</strong>, <strong>Midtones</strong> or <strong>Highlights</strong> toward a colour to tint just that range — for example, slightly blue shadows and warm highlights.</li><li><strong>Vignette</strong> darkens the edges to draw the eye to the centre. Use it lightly.</li></ul>
<p>Every control is explained in <a href="/docs/lumetri/">Lumetri Color</a>, and the scopes in <a href="/docs/scopes/">Lumetri Scopes</a>.</p>
<h2>Step 6: Make every clip match</h2>
<p>A scene looks wrong when one shot is warmer than the next. Therefore, compare clips side by side: put the playhead on a corrected clip, look at its scopes, then move to the next clip and adjust it until the waveform and colours sit in the same place.</p>
<p>For a whole section, use an <strong>adjustment layer</strong> instead: <strong>Sequence ▸ Add Adjustment Layer</strong>, stretch it over the clips and apply Lumetri Color to it once. Everything below it changes together. See <a href="/docs/adjustment-layers/">Adjustment layers</a>.</p>
<h2>Color correction vs color grading</h2>
<p>Color correction makes footage look natural and consistent. Color grading then gives it a mood, such as warm and nostalgic or cold and tense (<a href="https://en.wikipedia.org/wiki/Color_grading" target="_blank" rel="noopener">background on Wikipedia</a>). In Reelsmith, <strong>Effects ▸ Filters</strong> has one-click looks like Cinematic, Teal &amp; Orange and Golden Hour. Apply one after you correct, then fine-tune it in Lumetri Color.</p>
<h2>Common mistakes</h2>
<ul><li><strong>Too much saturation.</strong> It looks great for a second, then cheap. Skin tones are the first warning.</li><li><strong>Crushed blacks.</strong> If shadows turn into one black blob, raise Blacks or Shadows.</li><li><strong>Correcting on a very bright or very dark screen.</strong> Check the scopes and, if you can, look at the export on a phone too.</li></ul>
<h2>Frequently asked questions</h2>
<h3>Can I use one color correction for several clips?</h3>
<p>Yes. Put an adjustment layer over the clips and apply Lumetri Color to it once (step 6). Clips that need extra work can still get their own correction underneath.</p>
<h3>How do I reset a clip's colour?</h3>
<p>Click <strong>Reset Lumetri</strong> at the bottom of the Lumetri Color section.</p>
<h3>Does color correction slow down the export?</h3>
<p>Hardly. The colour work runs on your graphics chip, both in the preview and in the export.</p>
<h3>Is my video uploaded when I color correct it?</h3>
<p>No. Everything, including the export, happens on your own device.</p>
<p>Ready? <a href="/">Open the editor</a>, or read how to <a href="/blog/compress-video-without-losing-quality/">export a smaller file without losing quality</a> once your colours are right.</p>`;

await savePostScript({
  title: 'How to Color Correct a Video (Free, in Your Browser)',
  slug: 'how-to-color-correct-a-video',
  section: 'blog', status: 'published', publishAt: new Date('2026-11-22T10:00:00+06:00'),
  excerpt: 'Color correct a video step by step: fix the white balance, set exposure and contrast, bring back colour and make every clip match — with Lumetri Color, free in your browser.',
  metaTitle: 'How to Color Correct a Video (Free)',
  metaDescription: 'Color correct a video for free: fix white balance, exposure and contrast, add colour and match every clip with Lumetri Color in your browser — no upload.',
  focusKeyword: 'color correct a video', synonyms: 'color correction, colour correction, fix video colors, white balance, lumetri color',
  keywords: 'color correct video, color correction, white balance, exposure, lumetri color, color grading, free video editor',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Color correct a video with Lumetri Color: temperature, contrast, highlights and saturation in Effect Controls' },
  contentHtml: html, order: 99,
});
process.exit(0);
