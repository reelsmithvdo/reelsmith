# Reelsmith

A non-linear video editor for the browser and for macOS (Electron). Original code — no third-party editor code.

## Run the desktop app
```
npm install     # first time only
npm start
```
A snapshot of the desktop-only version is kept in the `desktop` branch / `desktop-v1.0` tag.

## Tests
```
npm test                      # every feature, in 4 modes: web, phone, tablet, desktop app
npm test -- captions          # only spec files whose name contains "captions"
npm test -- --mode=phone      # one mode
npm test -- --slow            # also the slow tests (auto captions download a speech model)
npm test -- --show            # watch the test window
```
Specs live in `tests/specs/*.test.js` (one file per feature area); helpers in `tests/runner.js` and `tests/page-helpers.js`.

## Website (Cloudflare Workers)
The same `src/` folder is the website. Every push to `main` deploys it (see `wrangler.jsonc`).
- Static files in `src/` are served directly by Cloudflare; `worker/index.js` only handles `POST /api/feedback`.
- `src/js/web.js` adds the browser-only parts (menu bar, start screen, saving in the browser, Report a Bug / Request a Feature) and does nothing in the desktop app.
- Auto captions in the browser download Whisper (transformers.js + model from Hugging Face) on first use only.
- Bug reports become GitHub issues in `FEEDBACK_REPO` (a private repo) once the `GITHUB_TOKEN` secret is set in the Cloudflare dashboard.
- Local preview: `npx wrangler dev` then open http://localhost:8787

## Workspace
| Panel | What it does |
|---|---|
| **Project** | Import video / audio / images (⌘I or drag files in). Double-click to open in Source. Offline media → double-click to relink. |
| **Effects** | Fades, dissolves, color looks, blur, Ken Burns zoom, picture-in-picture, audio fades/levels. Drag onto a clip or double-click to apply to the selection. |
| **Source** | Preview a clip, set In/Out (I/O), then Insert (,) or Overwrite (.) at the playhead, or drag it to the timeline. |
| **Effect Controls** | Position, scale, rotation, opacity, fades, brightness/contrast/saturation/hue/B&W/sepia/blur, speed, volume, and full title styling. Stopwatch = keyframes. Drag labels to scrub values. |
| **Program** | Composited output. Click a clip in the frame to select it, drag to move, drag corners to scale. |
| **Timeline** | Unlimited video/audio tracks, linked A/V clips, overwrite edits, snapping, trimming, razor, ripple delete, mute/solo/lock/hide, waveforms, thumbnails. |

## Tools (Tools strip, left of the timeline)
Selection **V** · Track Select Forward **A** / Backward **⇧A** · Ripple Edit **B** · Rolling Edit **N** · Rate Stretch **R** ·
Razor **C** (⇧-click = all tracks) · Slip **Y** · Slide **U** · Hand **H** · Zoom **Z** (Alt-click out) ·
Type **T** (click in the Program monitor and type; double-click a title to edit) · Rectangle / Ellipse (drag in the Program monitor).

## Transitions, markers, In/Out
- Video transitions (Cross Dissolve, Dip to Black/White, Push, Slide, Wipe, Iris Round, Cross Zoom): drag from Effects onto a clip edge or cut,
  or ⌘D at the nearest edit. Two-sided transitions are centred on the cut and use media handles when available.
- Audio transitions (Constant Power/Gain) — ⇧⌘D.
- Markers: **M** add/edit, **⇧M** next. Sequence In/Out: **I / O**, **⌥X** clear. Export can use the In/Out range.

## Sequences, nesting, multicam
- A project holds many sequences (Project panel). Open them in tabs above the timeline; drag one into another to nest it.
- **Nest…** (right-click clips) moves the selection into a new sequence; double-click the nested clip to open it.
- **Create Multi-Camera Source Sequence** (select 2–9 clips in the Project panel): sync by audio waveform or In points.
  Press **1–9** to switch cameras (cuts are added while playing). Program ▸ **Multi-Camera** (⇧0) shows every angle; click one to cut.

## Color & scopes
- **Lumetri Color** in Effect Controls: Basic Correction (temperature, tint, exposure, contrast, highlights, shadows, whites,
  blacks, saturation), RGB **Curves**, Shadows/Midtones/Highlights **Color Wheels**, Vignette.
- **Lumetri Scopes** tab: Luma waveform, RGB parade, YUV vectorscope (with skin-tone line), histogram.

## Masks & tracking
- Ellipse / Rectangle masks (Effect Controls ▸ Opacity) or the **Pen tool (P)**: click points on the clip in the Program monitor,
  Enter or click the first point to close. Edit handles directly on screen. Feather, opacity, expansion, invert, multiple masks.
- **Track ▶** follows the masked subject forward from the playhead (template matching on decoded frames).

## Sequence frame size
The first video clip you add sets the sequence size automatically (vertical 9:16 phone video → 1080×1920-style sequence,
16:9 → landscape, etc.). Turn this off in Sequence Settings.

## Timeline view
Auto-fit keeps every clip visible as the edit grows. Zooming manually pauses auto-fit; press **\** (or the Auto-fit button) to resume.

## Key shortcuts
Space play/pause · J/K/L shuttle · ←/→ frame (⇧ = 5) · ↑/↓ edit points · S snapping · ⌘K split · ⇧⌘K split all ·
Delete / ⇧Delete ripple · ⌘C/X/V · ⌘L link/unlink · ⌘R speed/duration · ⇧E enable/disable · ⌥←/→ nudge ·
⌘Z/⇧⌘Z · ⌘T title · = / - / \ zoom · ⌘-scroll zoom · Alt-click one side of a linked clip · Alt-drag duplicate ·
⌘ while dropping = insert · right-click clips, gaps, transitions and track headers for context menus.
Full list: Help → Keyboard Shortcuts (⌘/).

## Export
File → Export (⌘M): choose **Preset** (YouTube 1080p/4K, Shorts/Reels/TikTok 9:16, Instagram 1:1 and 4:5, Vimeo, X, review copy),
**file name and destination folder** (Browse…), format (H.264 MP4 / WebM), frame size, quality, and range (entire sequence,
In/Out, or selected clips). Different aspect ratios are letterboxed.
**Render: Fast** (default) decodes the exact source frame for every output frame and encodes with WebCodecs — typically many
times faster than real time; audio is mixed offline sample-accurately. **Real-time** is used automatically when a clip needs it
(e.g. speed-changed audio, which needs pitch-preserved playback).

## Projects
Saved as `.rsproj` (JSON referencing your media files by path). Work is autosaved and offered for recovery after a crash.

## Known limits (v1)
- Formats are whatever macOS/Chromium can decode (MP4/H.264, HEVC, MOV/H.264, WebM, MP3, WAV, AAC…). ProRes and AVI are not supported.
- Reverse playback (J) steps frames rather than playing smoothly.
- No AI features by design (no Speech-to-Text, Generative Extend, Enhance Speech).

## Third-party
`src/vendor/mediabunny.js` — mediabunny 1.61.6 (MPL-2.0, unmodified, license in `src/vendor/MEDIABUNNY-LICENSE.txt`)
for WebCodecs demuxing/muxing in the fast exporter and tracker.
