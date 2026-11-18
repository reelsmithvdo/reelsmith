// Blog post, scheduled 2026-12-10 10:00 (Asia/Dhaka): "How to Make a Photo Slideshow with Music". Image: src/assets/shots/slideshow.jpg
// (scenes-blog.js "slideshow"). Features: images 5 s by default, Speed/Duration (⌘R), Scale to fill frame, Slow Zoom In (Ken Burns), ⌘D.
import { savePostScript, fig, tip } from './save.mjs';

const IMG = '/assets/shots/slideshow.jpg';
const html = `<p>A slideshow is the easiest way to share a trip, a birthday or a year in photos — and with gentle movement and the right song it feels like a little film. This guide shows how to make a photo slideshow with music: import the photos, set how long each one stays, add slow zooms and soft transitions, then fit everything to the song. It's free in Reelsmith, an editor in your browser, and your photos are never uploaded.</p>
${fig(IMG, 'Make a photo slideshow with music: seven photos on V1 with Cross Dissolves and slow zooms, a song on A1 and the photos in grid view', 'Seven trip photos on V1 with Cross Dissolves and Slow Zoom In, the song on A1, and the Project panel in Grid view.')}
<h2>Step 1: Choose and order your photos</h2>
<p>Pick fewer photos than you think — 15 to 40 for a song of three or four minutes. Choose a mix of wide scenes, close-ups and faces, and put them in a rough order: by time, by place or by mood. Renaming the files with numbers (01, 02, 03…) makes them easy to sort.</p>
<h2>Step 2: Import the photos and put them on the timeline</h2>
<ol><li>Open <a href="/">the editor</a>. Select the photos in their folder on your computer — JPG, PNG, WebP and other common formats work.</li><li>Drag them straight onto <strong>V1</strong> in the timeline. They are imported and placed one after another.</li><li>Click <strong>Grid</strong> in the Project panel to see them as thumbnails. To change the order on the timeline, drag a photo to a new place.</li></ol>
<h2>Step 3: Set how long each photo stays</h2>
<p>Each photo starts as a five-second clip — a calm, comfortable pace. For a livelier slideshow, 3 to 4 seconds per photo works well. To change a photo's length, press <code>B</code> for the <strong>Ripple Edit</strong> tool and drag its right edge: the photos after it move along, so no gaps appear. For one exact length, select the photo and press <code>⌘R</code> (<strong>Speed/Duration</strong>).</p>
<p>Photos taken in portrait or a different shape show black bars. To fill the frame instead, select them and tick <strong>Scale to fill frame</strong> in Effect Controls ▸ Motion.</p>
<h2>Step 4: Add slow zooms (the Ken Burns effect)</h2>
<p>Still photos come alive with a slow push-in or pull-out, a technique named after the documentary maker <a href="https://en.wikipedia.org/wiki/Ken_Burns_effect" target="_blank" rel="noopener">Ken Burns</a>. Select all photos and drag <strong>Effects ▸ Blur &amp; Motion ▸ Slow Zoom In (Ken Burns)</strong> onto them. For variety, give every second photo <strong>Slow Zoom Out</strong> instead.</p>
${tip('Want the zoom to end on a face? Select the photo, open Effect Controls ▸ Motion and add Position keyframes as well as Scale, so the picture drifts toward the person.')}
<h2>Step 5: Add soft transitions</h2>
<p>Select all photos and press <code>⌘D</code>: every cut gets a <strong>Cross Dissolve</strong>. For a slideshow, one second is a good length. Keep to one or two transition types; a different effect on every photo quickly feels cheap. More in <a href="/blog/how-to-add-transitions-between-video-clips/">how to add transitions between clips</a>.</p>
<h2>Step 6: Add the music</h2>
<ol><li>Import a song you're allowed to use and drag it onto <strong>A1</strong>.</li><li>If the slideshow is longer than the song, delete some photos or shorten their duration. If it's shorter, cut the song with the razor (<code>C</code>) at the end of the last photo.</li><li>Give the song a <strong>Fade Out</strong> of two or three seconds in Effect Controls ▸ Audio.</li></ol>
<p>For a polished edit, move the cuts onto the beat: the waveform shows the beats as peaks. Drag the edge between two photos with the <strong>Rolling Edit</strong> tool (<code>N</code>) to the nearest peak. Need a royalty-free song? See <a href="/blog/add-music-to-video-without-drowning-voice/">where to get music and how to mix it</a>.</p>
<h2>Step 7: Add a title and export</h2>
<p>Open <strong>Effects ▸ Title Templates</strong> and drop <strong>Elegant Title</strong> at the start — for example "Lisbon, Summer 2026". Then click <strong>Export</strong> and pick a preset: <strong>YouTube 1080p</strong> for a TV or computer, or <strong>Instagram Portrait</strong> for a phone.</p>
<h2>Slideshow ideas</h2>
<ul><li><strong>Birthday or anniversary:</strong> old photos first, the newest at the end.</li><li><strong>Travel:</strong> one short video clip between photos adds energy — the timeline mixes both.</li><li><strong>Memorial:</strong> slower pace, 6–7 seconds per photo and soft dissolves.</li><li><strong>Product or portfolio:</strong> a clean white background, a logo and short captions.</li></ul>
<h2>Frequently asked questions</h2>
<h3>How many photos can I use?</h3>
<p>There's no fixed limit. Hundreds of photos work; very large photo files take a moment longer to import.</p>
<h3>Can I add a caption to each photo?</h3>
<p>Yes. Press <code>T</code>, click in the Program monitor and type, then drag the title clip on V2 to cover that photo.</p>
<h3>Are my photos uploaded?</h3>
<p>No. They stay on your device from import to export.</p>
<p>Ready? <a href="/">Open the editor</a> and turn your photos into a film.</p>`;

await savePostScript({
  title: 'How to Make a Photo Slideshow with Music (Free)',
  slug: 'make-a-photo-slideshow-with-music',
  section: 'blog', status: 'published', publishAt: new Date('2026-12-10T10:00:00+06:00'),
  excerpt: 'Make a photo slideshow with music: import your photos, set the timing, add slow Ken Burns zooms and soft transitions, and fit it all to a song — free in your browser.',
  metaTitle: 'How to Make a Photo Slideshow with Music (Free)',
  metaDescription: 'Make a photo slideshow with music: set the timing, add slow zooms and soft transitions, fit it to a song and export — free in your browser, no upload.',
  focusKeyword: 'photo slideshow with music', synonyms: 'slideshow, photo video, picture slideshow, slideshow maker, Ken Burns effect',
  keywords: 'photo slideshow with music, slideshow maker, photo video, ken burns effect, cross dissolve, birthday slideshow, free',
  category: 'tutorials',
  featuredImage: { src: IMG, alt: 'Photo slideshow with music: photos with transitions on V1, a song on A1 and the photos in grid view' },
  contentHtml: html, order: 99,
});
process.exit(0);
