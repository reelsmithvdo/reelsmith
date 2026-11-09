'use strict';
// Reelsmith knowledge base — single source for the in-app Help Center and docs/User-Guide.md.
// Markup: "## Heading", "- list item", "1. numbered", **bold**, `key or code`, [[article-id|link text]].
(function (root) {
  const RS = (root.RS = root.RS || {});
  RS.HELP_CATEGORIES = [
    'Getting Started', 'Media & Project Panel', 'Editing in the Timeline', 'Titles & Graphics',
    'Effects & Transitions', 'Color', 'Audio', 'Captions', 'Sequences & Multicam', 'Exporting', 'Projects & Saving', 'Reference',
  ];
  // Pick the web or desktop wording in {{web:…|desktop:…}} passages.
  RS.helpVariant = (body, edition) => body.replace(/\{\{web:([^|}]*)\|desktop:([^}]*)\}\}/g, (_, w, d) => (edition === 'desktop' ? d : w));
  RS.HELP_ARTICLES = [
    // ------------------------------------------------------------------ Getting Started
    {
      id: 'welcome', cat: 'Getting Started', title: 'Welcome to Reelsmith',
      body: `Reelsmith is a non-linear video editor that runs in your web browser and as a desktop app for macOS. You bring media into a project, arrange it on a multi-track timeline, add titles, effects, transitions and color, and export finished video files.

## What you can do
- Edit video, audio and still images on unlimited video and audio tracks.
- Trim and rearrange with professional tools: ripple, rolling, slip, slide, rate stretch and razor.
- Add titles, shapes, masks, keyframed motion, Lumetri-style color and transitions.
- Work with nested sequences and multi-camera footage.
- Export H.264 MP4 or WebM, faster than real time.

## Where to start
- New to editing? Follow [[first-edit|Your first edit in 5 minutes]].
- Want a map of the screen? Read [[workspace|The workspace]].
- Looking for a key? See [[shortcuts|Keyboard shortcuts]].
- Using the website? Read [[browser-edition|Reelsmith in your browser]].`,
    },
    {
      id: 'browser-edition', only: 'web', cat: 'Getting Started', title: 'Reelsmith in your browser',
      body: `The browser edition is the full editor on a web page — nothing to install. Your videos are **never uploaded**: editing and exporting happen on your own computer.

## Best browsers
- **Chrome** or **Edge** (recommended): fastest export, export straight to a file you choose, and media that reconnects automatically when you reopen a project.
- **Safari** and **Firefox** work too; exports go to your Downloads folder and media may need relinking after you reopen a project.

## The start screen
Each visit opens the start screen: **New Project**, **Open From Computer** (import media), **Start Editing**, your **Recent projects**, and a drop zone for files. Click the Reelsmith logo or choose **File ▸ Home** to come back to it.

## Saving
- **File ▸ Save** (\`⌘S\` / \`Ctrl+S\`) keeps the project in this browser; it appears under Recent projects.
- **File ▸ Download Project File** saves a \`.rsproj\` copy on your disk (for backups or another computer). Open it with **File ▸ Open Project File**.
- Projects contain your edits, not your media files. Keep the original videos where they are.
- Clearing your browser's site data deletes projects saved in the browser — download a project file for anything important.

## Reconnecting media
In Chrome and Edge, when you reopen a project Reelsmith asks once for permission to read your media files again — click **Reconnect files**. Files added in other browsers, or moved since, show as offline: right-click ▸ **Relink** (see [[offline-media|Offline media and relinking]]).

## Exporting
Click **Export**, then **Export** again. Chrome and Edge ask where to save the video; other browsers put it in Downloads. Keep the tab open until the export finishes.

## Keyboard
All single-key shortcuts work. A few browser shortcuts can't be taken over (for example \`⌘T\`, \`⌘N\`, \`⌘W\`) — use the menu bar or the tool keys instead (\`T\` is the Text tool).

## Feedback
Found a problem or have an idea? Use **Report a Bug** or **Request a Feature** at the top right (or in the Help menu).`,
    },
    {
      id: 'install', only: 'desktop', cat: 'Getting Started', title: 'Installing and starting Reelsmith',
      body: `## Requirements
- macOS with Node.js 18 or newer installed.
- About 400 MB of free disk space for the app and its runtime.

## First run
1. Open Terminal in the Reelsmith folder.
2. Run \`npm install\` once to download the runtime.
3. Run \`npm start\` to launch the editor.

## Next time
Run \`npm start\` again. If Reelsmith closed unexpectedly, it offers to restore your unsaved work when it opens (see [[autosave|Autosave and recovery]]).`,
    },
    {
      id: 'workspace', cat: 'Getting Started', title: 'The workspace',
      body: `The window is divided into four resizable panels. Drag the thin gaps between panels to resize them; Reelsmith remembers the layout.

## Top left: Effect Controls, Lumetri Scopes, Source
- **Effect Controls** shows the properties of the selected clip: motion, opacity, masks, color, speed, audio and text. See [[effect-controls|Effect Controls and keyframes]].
- **Lumetri Scopes** shows waveform, parade, vectorscope and histogram of the program picture. See [[scopes|Lumetri Scopes]].
- **Source** previews a single media file so you can mark the part you want. See [[source-monitor|The Source monitor]].

## Top right: Program monitor
The output of the timeline at the playhead. Play, step, type a timecode, and move or resize clips directly in the picture. See [[program-monitor|The Program monitor]].

## Bottom left: Project and Effects
- **Project** lists your media and sequences. See [[project-panel|The Project panel]].
- **Effects** lists effects and transitions to drag onto clips. See [[effects-vs-transitions|Effects vs. transitions]].

## Bottom right: Timeline
Tracks, clips, the playhead, the Tools strip on the left, the zoom scroll bar at the bottom and audio meters on the right. See [[timeline-basics|Timeline basics]].

## Top bar and status bar
The top bar has the project name, Undo/Redo, Sequence Settings, Help, Save and Export. The status bar shows the frame size, frame rate, clip count and whether everything is saved.`,
    },
    {
      id: 'first-edit', cat: 'Getting Started', title: 'Your first edit in 5 minutes',
      body: `1. **Import:** press \`⌘I\` (or drag files from {{web:a folder on your computer|desktop:Finder}} onto the Project panel).
2. **Add to the timeline:** drag a clip from the Project panel onto track **V1**. The sequence frame size automatically matches this first video (for example 9:16 for phone video).
3. **Play:** press \`Space\`. Use \`J\` \`K\` \`L\` to shuttle back, stop and forward.
4. **Cut out a part:** move the playhead to where the unwanted part starts, press \`⌘K\` to split, move to its end, press \`⌘K\` again, click the middle piece and press \`⇧Delete\` to remove it and close the gap.
5. **Add a title:** press \`T\`, click in the Program monitor and type. Click outside the text when done.
6. **Add a transition:** open **Effects**, drag **Cross Dissolve** onto the start of a clip. It previews automatically.
7. **Export:** press \`⌘M\`, choose a preset and location, and click **Export**.

That's a complete edit. Save the project with \`⌘S\` to keep working on it later.`,
    },

    {
      id: 'program-monitor', cat: 'Getting Started', title: 'The Program monitor',
      body: `The Program monitor shows the timeline's output at the playhead — exactly what will be exported.

## Transport
- Play/pause, step one frame back or forward, jump to the previous/next edit, and go to the start or end.
- Click the timecode on the left to type a time (for example \`00:01:15:00\` or \`75\` for 75 seconds) and press \`Enter\`.
- The timecode on the right is the sequence duration.

## Working in the picture
- Click a clip to select it; drag to move it; drag a corner handle to scale. It snaps to the centre and frame edges — hold \`Shift\` to move freely.
- Double-click a title to edit its text.
- With the Type, Rectangle, Ellipse or Pen tool, click or drag here to create titles, shapes and masks.
- Drop an effect from the Effects panel onto the picture to apply it to the clip under the pointer.

## View options
- **Fit / 25% / 50% / 75% / 100%:** monitor zoom.
- **Safe:** shows title-safe and action-safe guides.
- **Multi-Camera:** shows every camera angle of a multicam clip. See [[multicam|Multi-camera editing]].`,
    },

    // ------------------------------------------------------------------ Media & Project Panel
    {
      id: 'import', cat: 'Media & Project Panel', title: 'Importing media',
      body: `## Ways to import
- **File ▸ Import Media…** or \`⌘I\`.
- The **Import** button in the Project panel.
- Drag files from {{web:a folder on your computer|desktop:Finder}} onto the Project panel.
- Drag files from {{web:a folder|desktop:Finder}} straight onto a timeline track: they are imported and placed where you drop them, one after another.

While importing, Reelsmith reads each file's duration and size, makes a thumbnail and analyses the audio waveform. Importing the same file twice reuses the existing item.

## Supported formats
- **Video:** MP4, MOV, M4V, WebM, MKV, OGV with codecs {{web:your browser|desktop:macOS}} can decode (H.264, HEVC/H.265, VP8, VP9, AV1).
- **Audio:** MP3, WAV, M4A/AAC, OGG, FLAC, Opus.
- **Images:** PNG, JPEG, GIF, WebP, BMP, SVG, AVIF.

ProRes and AVI files are generally not supported. If a file is rejected, convert it to H.264 MP4 first.

## Audio detection
Video files without a sound track are marked **no audio** and are placed without an audio clip.`,
    },
    {
      id: 'project-panel', cat: 'Media & Project Panel', title: 'The Project panel',
      body: `The Project panel holds everything in your project: sequences first, then media.

## Toolbar
- **Import**, **New title at playhead**, **New color matte**, **New sequence**, **Create Multi-Camera Source Sequence**, **Delete**.
- **Search** filters by name. **Grid/List** switches the view.

## Working with items
- Click to select; \`⌘\`-click or \`Shift\`-click to select several.
- Double-click media to open it in the [[source-monitor|Source monitor]]. Double-click a sequence to open it in the timeline.
- Drag media or a sequence onto the timeline to use it.
- **Used N×** shows how many times a file appears in the open sequence.
- Right-click for Open in Source Monitor, Create Multi-Camera Source Sequence, Relink{{web:|desktop:, Reveal in Finder}} and Delete.
- Deleting media that is used in the timeline asks for confirmation and removes those clips too.

See also [[offline-media|Offline media and relinking]].`,
    },
    {
      id: 'offline-media', cat: 'Media & Project Panel', title: 'Offline media and relinking',
      body: `Projects store the location of each media file rather than copying it. If a file is moved, renamed or deleted, it shows as **Offline** (red badge in the Project panel, striped clips in the timeline).

## To relink
1. Double-click the offline item in the Project panel (or right-click ▸ Relink Media…).
2. Choose the file's new location.

All clips using that file come back. If the new file is shorter than the original, Reelsmith warns you first.

**Tip:** keep a project's media in one folder next to the project file so it is easy to move together.`,
    },
    {
      id: 'source-monitor', cat: 'Media & Project Panel', title: 'The Source monitor',
      body: `The Source monitor previews one media file so you can choose exactly which part to use.

## Mark the part you want
1. Double-click a clip in the Project panel. The Source tab opens.
2. Play or click in the bar under the picture to find the start. Press \`I\` (Mark In).
3. Find the end and press \`O\` (Mark Out). The highlighted range is what you will use.

## Put it in the timeline
- **Insert** (\`,\`): places the range at the playhead and pushes everything after it later.
- **Overwrite** (\`.\`): places the range at the playhead, replacing what is there.
- Or drag the **Drag to timeline** handle onto any track.

Dragging the item from the Project panel also uses the In/Out marks you set here.

\`I\` and \`O\` work in the Source monitor when it is the active panel (click inside it first). In the timeline they set the sequence In/Out instead.`,
    },

    // ------------------------------------------------------------------ Editing in the Timeline
    {
      id: 'timeline-basics', cat: 'Editing in the Timeline', title: 'Timeline basics',
      body: `## Tracks
Video tracks (V1, V2 …) are stacked: higher tracks appear on top in the picture. Audio tracks (A1, A2 …) are mixed together. Add tracks with **+ Video** / **+ Audio** in the timeline toolbar. See [[tracks|Tracks: lock, hide, mute, solo]].

## The playhead
The red line shows the current time. Click or drag in the ruler to move it. The timecode on the left of the ruler shows its position.

## Adding clips
- Drag from the Project panel or Source monitor onto a track. Hold \`⌘\` while dropping to **insert** (push later clips right) instead of **overwrite**.
- A video with sound becomes a **linked** pair: picture on a video track and sound on the matching audio track.

## Overwrite behaviour
When a clip is moved or dropped on top of others, it replaces whatever is under it — clips underneath are trimmed or split, exactly like a professional editor.

## Zoom and scroll
See [[zoom-scroll|Zooming and the zoom scroll bar]].`,
    },
    {
      id: 'select-move-trim', cat: 'Editing in the Timeline', title: 'Selecting, moving and trimming clips',
      body: `## Select
- Click a clip. Linked video and audio are selected together.
- \`Shift\`- or \`⌘\`-click to add or remove clips.
- Drag on empty track space to draw a selection box.
- \`⌘A\` selects everything; \`Esc\` deselects.

## Move
Drag a clip left/right, or up/down to another track of the same kind. A tooltip shows how far it moved. Hold \`Alt\` while dragging to leave a **copy** behind.

## Trim
Drag the left or right edge of a clip. Trimming stops at the end of the source media. Linked clips trim together; hold \`Alt\` to trim only one side.

## Nudge
\`⌥←\` / \`⌥→\` moves the selected clips one frame (add \`Shift\` for five).

## Snapping
With snapping on (\`S\`, magnet icon), edges snap to the playhead, other clip edges, markers and In/Out points.

**Dropping clips from the Project panel:** a clip dropped on top of, or just to the right of, the clip on its left goes straight to that clip's end, so clips line up with no gap and nothing is overwritten. Drop it further right to leave a gap. Turn snapping off (\`S\`) to drop at the exact pointer position, overwriting what is there. Hold \`⌘\` while dropping to insert and push later clips right.`,
    },
    {
      id: 'splitting', cat: 'Editing in the Timeline', title: 'Splitting clips (razor and Add Edit)',
      body: `## Razor tool
Press \`C\` and click a clip where you want to cut it.
- A normal click cuts linked video and audio together.
- \`Alt\`-click cuts only the side you click.
- \`Shift\`-click cuts every unlocked track at that point.

## Split at the playhead
- \`⌘K\` splits the **selected** clips at the playhead (or all clips under the playhead if nothing is selected).
- \`⇧⌘K\` splits every unlocked track at the playhead.

To split only the audio (or only the video) with \`⌘K\`, \`Alt\`-click that side first so only it is selected.

Press \`V\` to return to the Selection tool.`,
    },
    {
      id: 'unlink', cat: 'Editing in the Timeline', title: 'Detaching audio from video',
      body: `## Unlink
- Right-click the clip ▸ **Unlink**, or select it and press \`⌘L\`.

The video and audio become independent: move, trim, split or delete either one alone. An unlinked clip shows a small yellow **⧉** mark.

## Remove the sound, keep the picture
Unlink, click the audio clip, press \`Delete\`.

## Work on one side without unlinking
- \`Alt\`-click selects only the side you click.
- \`Alt\` + Razor cuts only that side.
- Turn off **Linked Selection** (chain icon in the timeline toolbar) to make every click select only one side.

## Link again
Select the video and audio clips and press \`⌘L\` (or right-click ▸ Link).`,
    },
    {
      id: 'delete-gaps', cat: 'Editing in the Timeline', title: 'Deleting clips and closing gaps',
      body: `- \`Delete\` removes the selected clips and leaves a gap.
- \`⇧Delete\` (**Ripple Delete**) removes them and pulls later clips on those tracks left to close the gap.
- To close an existing empty gap: right-click inside the gap ▸ **Ripple Delete Gap**.`,
    },
    {
      id: 'tools', cat: 'Editing in the Timeline', title: 'The Tools strip',
      body: `The vertical Tools strip is on the left of the timeline. Hover a tool to see its name and shortcut.

- **Selection** \`V\` — select, move and trim.
- **Track Select Forward** \`A\` — click to select a clip and everything after it on all tracks (\`Shift\`-click: only that track). Then drag to move them all.
- **Track Select Backward** \`⇧A\` — the same, for everything before.
- **Ripple Edit** \`B\` — drag a clip edge; later clips move to keep no gap.
- **Rolling Edit** \`N\` — drag the cut between two clips; one gets longer, the other shorter, total length unchanged.
- **Rate Stretch** \`R\` — drag an edge to change the clip's speed so the same footage fills the new length.
- **Razor** \`C\` — click to cut a clip.
- **Slip** \`Y\` — drag a clip to change which part of the source plays, without moving it.
- **Slide** \`U\` — drag a clip between its neighbours; they are trimmed so no gap opens.
- **Hand** \`H\` — drag to scroll the timeline.
- **Zoom** \`Z\` — click to zoom in, \`Alt\`-click to zoom out.
- **Type** \`T\` — click in the Program monitor to write a title. See [[titles|Titles]].
- **Rectangle / Ellipse** — drag in the Program monitor to draw a shape. See [[shapes|Shapes and color mattes]].
- **Pen** \`P\` — click points on a clip in the Program monitor to draw a mask. See [[masks|Masks]].`,
    },
    {
      id: 'zoom-scroll', cat: 'Editing in the Timeline', title: 'Zooming and the zoom scroll bar',
      body: `## Zoom scroll bar
The bar at the bottom of the timeline shows which part of the sequence is visible.
- Drag the **middle** to scroll.
- Drag the **right round handle** left to zoom in (clips get longer) or right to zoom out (clips get shorter). The left handle works the same way.
- Click the empty track to jump there; double-click to fit the whole sequence.

## Other ways to zoom
- \`=\` / \`-\` zoom in and out; \`\\\` fits the sequence.
- \`⌘\` + scroll zooms around the pointer.
- The zoom slider and buttons in the timeline toolbar.

## Auto-fit
While **Auto-fit** is on, the timeline zooms itself so every clip stays visible as your edit grows. Zooming manually turns it off; press \`\\\` or click **Auto-fit** to turn it back on.`,
    },
    {
      id: 'tracks', cat: 'Editing in the Timeline', title: 'Tracks: lock, hide, mute, solo',
      body: `Each track header has buttons:
- **Eye** (video): hide the track from the picture.
- **M** (audio): mute the track. **S**: solo — when any track is soloed, only soloed tracks are heard.
- **Lock**: protect the track from edits.
- **×** (on hover, empty tracks only): delete the track.

Right-click a track header to add video or audio tracks or delete an empty one.`,
    },
    {
      id: 'markers-inout', cat: 'Editing in the Timeline', title: 'Markers and sequence In/Out',
      body: `## Markers
- \`M\` adds a marker at the playhead; press it on an existing marker to edit it.
- \`⇧M\` jumps to the next marker; **Sequence ▸ Go to Previous Marker** goes back.
- Click a marker in the ruler to jump to it; double-click to rename it, change its color or delete it.
- Right-click empty track space ▸ **Add Marker Here**.

## In and Out points
With the timeline or Program monitor active:
- \`I\` sets the In point and \`O\` the Out point at the playhead. The range is highlighted in the ruler.
- \`⇧I\` / \`⇧O\` jump to them; \`⌥X\` clears them.

Drag the In or Out edge of the highlighted range in the ruler to adjust it. Use **Range ▸ Sequence In/Out** in the Export dialog to export only that part — or skip In/Out entirely and drag the handles in the Export dialog itself.`,
    },
    {
      id: 'clip-commands', cat: 'Editing in the Timeline', title: 'Copy, paste, speed and other clip commands',
      body: `## Copy and paste
\`⌘C\`, \`⌘X\`, \`⌘V\`: pasted clips go to the playhead on their original tracks. **Duplicate** (Edit menu or right-click) places a copy right after the selection.

## Speed / Duration (⌘R)
Set a speed percentage or a new duration. Audio pitch is preserved during playback. Tick **Ripple Edit** to push later clips instead of overwriting them. You can also set speed in Effect Controls ▸ Time, or drag with the [[tools|Rate Stretch tool]].

## Enable / disable (⇧E)
A disabled clip stays in the timeline but is not seen or heard.

## Right-click menu
Cut, Copy, Paste, Duplicate, Clear, Ripple Delete, Enable/Disable, Link/Unlink, Speed/Duration, Apply Default Transitions, Add Fade In/Out, Set to Frame Size, Scale to Fill Frame, Reset Effects, Nest…, Rename and Reveal in Project.

## Undo
\`⌘Z\` undoes and \`⇧⌘Z\` redoes — up to 300 steps.`,
    },

    // ------------------------------------------------------------------ Titles & Graphics
    {
      id: 'titles', cat: 'Titles & Graphics', title: 'Titles',
      body: `## Create a title
- Press \`T\` (Type tool), click in the Program monitor where the text should be, and type. Press \`⌘Enter\` or click outside to finish. An empty title is discarded.
- Or press \`⌘T\` / click the **T** button in the Project panel to add a ready-made title at the playhead.

Titles go on the first free video track above V1, lasting 5 seconds.

## Edit a title
- Double-click it in the Program monitor (or in the timeline) to edit the text in place.
- **Effect Controls ▸ Text** sets the font, size, bold, italic, alignment, fill color, stroke width and color, shadow and background box.
- Move it by dragging in the Program monitor; resize with the corner handles.

## Animate a title
Use a transition such as Push or Cross Dissolve at its start/end, the Fade In/Out values in Opacity, or keyframes (see [[effect-controls|Effect Controls and keyframes]]).`,
    },
    {
      id: 'shapes', cat: 'Titles & Graphics', title: 'Shapes and color mattes',
      body: `## Shapes
Choose the **Rectangle** or **Ellipse** tool and drag in the Program monitor (hold \`Shift\` for a square or circle). A shape clip is added at the playhead. In **Effect Controls ▸ Shape**, set the width, height, corner radius, fill and stroke.

## Color matte
A solid full-frame color. Use the color-square button in the Project panel or **Sequence ▸ Add Color Matte**, then pick the color in Effect Controls. Mattes are useful as backgrounds behind titles.`,
    },

    // ------------------------------------------------------------------ Effects & Transitions
    {
      id: 'effects-vs-transitions', cat: 'Effects & Transitions', title: 'Effects vs. transitions',
      body: `The Effects panel has two kinds of items.

## Effects — change the whole clip
Color looks (Black & White, Sepia, Vintage, Vivid, Cool/Warm Tone, Brighten, Darken, Invert), Gaussian Blur, Slow Zoom In/Out (Ken Burns), Picture in Picture, fades and audio levels. The change is visible at any point in the clip.

## Transitions — change only the start or end
Video Transitions (Cross Dissolve, Dip to Black, Dip to White, Push, Slide, Wipe, Iris Round, Cross Zoom) animate the **first or last second** of a clip, or the cut between two clips. You only see them while the playhead passes that moment — this is why a transition can look like "nothing happened" if the playhead is in the middle of the clip.

Click any item in the Effects panel to see how to use it and an **Apply** button.

See [[apply-effects|Applying effects]] and [[transitions|Transitions]].`,
    },
    {
      id: 'apply-effects', cat: 'Effects & Transitions', title: 'Applying effects',
      body: `## Ways to apply
- Drag the effect onto a clip in the timeline.
- Drag it onto the **Effect Controls** panel (applies to the clip shown there).
- Drag it onto the picture in the **Program monitor** (applies to the clip under the pointer).
- Select a clip, then double-click the effect — or click it and press **Apply to selected clip**. With nothing selected, it applies to the clip under the playhead.

After applying, the clip is selected, Effect Controls opens, and the effect appears as a chip at the top (for example **fx Sepia**). Click the chip's **×** to remove that effect.

## Fine-tune
Effects set properties you can adjust in Effect Controls (for example Sepia sets Stylize ▸ Sepia to 85%). **Reset all effects** at the bottom of Effect Controls returns the clip to normal.`,
    },
    {
      id: 'effect-controls', cat: 'Effects & Transitions', title: 'Effect Controls and keyframes',
      body: `Select one clip to see its properties.

## Sections
- **Motion:** Position X/Y, Scale, Rotation, Scale to fill frame.
- **Opacity:** Opacity, Fade In, Fade Out and [[masks|Masks]].
- **Lumetri Color** and **Stylize & Blur:** see [[lumetri|Lumetri Color]].
- **Transitions:** what is on the clip's start and end.
- **Time:** speed with quick presets.
- **Audio:** Volume, Fade In, Fade Out (shown for linked audio too).
- **Text**, **Shape**, **Color Matte**, **Multi-Camera** for those clip types.

## Changing values
Drag a slider, type a number, or drag the property name left/right to scrub (hold \`Shift\` for ×10, \`Alt\` for fine steps). The circular arrow resets a property.

## Keyframes (animation)
1. Move the playhead to where the animation should start.
2. Click the **stopwatch** next to Position, Scale, Rotation, Opacity or Volume.
3. Move the playhead and change the value — a new keyframe is added automatically.

Use the ◀ ◆ ▶ buttons to jump between keyframes or add/remove one at the playhead. Keyframes show as small diamonds on the clip in the timeline. Click the stopwatch again to remove the animation and keep the current value.

## Motion in the picture
Click a clip in the Program monitor and drag to move it, or drag a corner to scale. It snaps to the centre and frame edges; hold \`Shift\` to move freely.`,
    },
    {
      id: 'transitions', cat: 'Effects & Transitions', title: 'Transitions',
      body: `## Add a transition
- Drag it from **Effects ▸ Video Transitions** onto the **left half** of a clip (its start) or the **right half** (its end). When two clips touch, dropping at the cut makes a transition between them.
- Or select a clip and press **Apply** (both ends), or press \`⌘D\` to add a Cross Dissolve at the edit nearest the playhead (or both ends of the selected clips).

The transition plays a short preview automatically. Press \`Space\` to watch again.

## Edit a transition
Transitions appear as striped boxes on clips. Click one to select it; Effect Controls shows its **Type** and **Duration**. Right-click it to change the type, set the duration or clear it. Press \`Delete\` to remove a selected transition.

## Between two clips
A transition on a cut is centred on the cut: the first clip continues past its end and the second starts before its beginning. When the source has extra footage there ("handles"), real frames are used; otherwise a frame is held.

## Single-sided
On a clip with nothing next to it, the transition goes from/to transparent — so Push slides a title in from the side, and Cross Dissolve fades it.`,
    },
    {
      id: 'audio-transitions', cat: 'Effects & Transitions', title: 'Audio transitions (crossfades)',
      body: `**Constant Power** and **Constant Gain** add matching fades at audio clip edges. Drag one onto an audio clip edge, select an audio clip and press **Apply**, or press \`⇧⌘D\` for the edit nearest the playhead. The fade length appears in Effect Controls ▸ Audio as Fade In / Fade Out.`,
    },
    {
      id: 'masks', cat: 'Effects & Transitions', title: 'Masks',
      body: `A mask shows only part of a clip, letting the tracks below show through the rest.

## Create a mask
- **Effect Controls ▸ Opacity ▸ Masks:** click **Ellipse** or **Rectangle**.
- **Pen tool** (\`P\`): with the clip under the playhead, click points around the area in the Program monitor. Click the first point or press \`Enter\` to close the shape; \`Esc\` cancels.

## Edit a mask
Click **Edit** on the mask in Effect Controls to show its handles in the Program monitor. Drag corners or points to reshape, or drag inside to move it. Masks follow the clip's position, scale and rotation.

## Mask settings
- **Feather:** softens the edge.
- **Opacity:** strength of the mask.
- **Expansion:** grows or shrinks the shape.
- **Inverted:** keeps the outside instead of the inside.

You can add several masks to one clip; they combine. Delete a mask with its trash button.

See [[tracking|Tracking a mask]] to make a mask follow a moving subject.`,
    },
    {
      id: 'tracking', cat: 'Effects & Transitions', title: 'Tracking a mask',
      body: `Tracking makes a mask follow something that moves, such as a face to blur or a product to highlight.

1. Put the playhead at the first frame where the subject is visible.
2. Draw a mask around the subject (see [[masks|Masks]]). Keep it reasonably snug.
3. Click **Track ▶** on the mask. A progress window shows the frames being analysed; click **Stop** to end early.

The mask now moves with the subject from that point to the end of the clip. **Clear track** removes the movement. Tracking works on video clips and follows position (not rotation or scale). It works best on subjects with clear detail and steady lighting.`,
    },

    // ------------------------------------------------------------------ Color
    {
      id: 'lumetri', cat: 'Color', title: 'Lumetri Color',
      body: `Open **Effect Controls ▸ Lumetri Color** with a clip selected.

## Basic Correction
- **Temperature:** cooler (blue) to warmer (orange). **Tint:** green to magenta.
- **Exposure** (in stops), **Contrast**, **Highlights**, **Shadows**, **Whites**, **Blacks**.
- **Saturation:** 0% is black and white, above 100% is more colourful.

## Curves
Choose **Master**, **Red**, **Green** or **Blue**. Click on the curve to add a point and drag it; double-click a point to remove it. Raising the middle brightens mid-tones; an S-shape adds contrast. **Reset channel** straightens it.

## Color Wheels
Shadows, Midtones and Highlights each have a wheel: drag the centre dot toward a color to tint that range; the slider below makes it lighter or darker. Double-click a wheel to reset it.

## Vignette
Darkens the edges of the clip.

**Reset Lumetri** clears all of these. Use the [[scopes|Lumetri Scopes]] to judge levels objectively. Simple Brightness, Contrast, Hue, Black & White, Sepia, Invert and Blur are under **Stylize & Blur**.`,
    },
    {
      id: 'scopes', cat: 'Color', title: 'Lumetri Scopes',
      body: `Open the **Lumetri Scopes** tab (top-left panel). It analyses the Program monitor picture live.

- **Waveform (Luma):** brightness from left to right of the frame; 0 is black, 100 is white. Keep important detail between them.
- **RGB Parade:** separate waveforms for red, green and blue — useful for spotting color casts.
- **Vectorscope YUV:** color direction and strength; targets mark red, magenta, blue, cyan, green and yellow. The orange line is the typical skin-tone direction.
- **Histogram:** how many pixels are at each brightness level, per channel.`,
    },

    // ------------------------------------------------------------------ Audio
    {
      id: 'audio', cat: 'Audio', title: 'Working with audio',
      body: `## Levels and fades
Select an audio clip (or the video of a linked pair) and use **Effect Controls ▸ Audio**: Volume (100% is original, up to 300%), Fade In and Fade Out. Volume can be keyframed for rises and dips.

## Track controls
Use **M** (mute) and **S** (solo) on audio track headers. See [[tracks|Tracks]].

## Meters
The meters on the right of the timeline show the left and right levels in dBFS while playing. Keep peaks below 0 — the top turns red when the signal is close to clipping.

## Waveforms
Audio clips show their waveform so you can find words and beats. Very long files (over 30 minutes or 400 MB) skip waveform analysis.

See also [[unlink|Detaching audio from video]] and [[audio-transitions|Audio transitions]].`,
    },

    // ------------------------------------------------------------------ Sequences & Multicam
    {
      id: 'sequence-settings', cat: 'Sequences & Multicam', title: 'Sequence settings and frame size',
      body: `A sequence has a frame size, frame rate and background color. Open **Sequence ▸ Sequence Settings…** (or the gear in the top bar).

## Automatic frame size
In a new sequence, the **first video clip** you add sets the frame size — a vertical phone video makes a 9:16 sequence, landscape makes 16:9. A message confirms the change, and \`⌘Z\` undoes it. Turn this off with **Match frame size to the first video clip** in Sequence Settings.

## Presets
HD 1080p, 4K UHD, HD 720p, Vertical 9:16, Square 1:1, Portrait 4:5 or Custom. Frame rates from 23.976 to 60 fps.`,
    },
    {
      id: 'sequences', cat: 'Sequences & Multicam', title: 'Multiple sequences',
      body: `A project can hold many sequences — for example different cuts or versions.

- **New Sequence:** Project panel button or **Sequence ▸ New Sequence…**.
- Sequences appear at the top of the Project panel. Double-click to open one.
- Open sequences appear as **tabs** above the timeline; click a tab to switch, **×** to close it.
- Right-click a sequence in the Project panel to rename or delete it.`,
    },
    {
      id: 'nesting', cat: 'Sequences & Multicam', title: 'Nested sequences',
      body: `Nesting puts several clips inside one clip, so you can treat them as a unit — for example to apply one effect or transition to a whole group.

## Nest clips
Select the clips, right-click ▸ **Nest…** (or **Sequence ▸ Nest…**), and name the new sequence. The clips are replaced by one nested clip, and the new sequence appears in the Project panel.

## Use a sequence inside another
Drag a sequence from the Project panel onto a track of the open sequence.

## Edit inside a nest
Double-click the nested clip to open its sequence in a new tab. Changes there appear everywhere it is used. A sequence cannot be placed inside itself.

Nested clips can be trimmed, split, moved and given effects, transitions and masks like any other clip.`,
    },
    {
      id: 'multicam', cat: 'Sequences & Multicam', title: 'Multi-camera editing',
      body: `Edit footage of the same event filmed from several cameras by switching between angles.

## 1. Create the multicam source sequence
1. In the Project panel, \`⌘\`-click 2 to 9 camera clips. The first one you select is Camera 1.
2. Click the multicam button (four squares) or right-click ▸ **Create Multi-Camera Source Sequence…**.
3. Choose **Synchronize by**: **Audio** (matches the sound waveforms) or **In points** (all start together).
4. Keep **Add to the current sequence** ticked to place it at the playhead.

Camera 1's audio is used. Each angle's sound is on its own track inside the multicam sequence, with the others muted — open it to change which you hear.

## 2. Cut between cameras
- Press \`1\`–\`9\` while playing: a cut is added at that moment and the new camera is used from there.
- With playback stopped, a number key switches the camera of the clip under the playhead.
- Click **Multi-Camera** in the Program monitor (or \`⇧0\`) to see all angles live; click an angle to cut to it. The active angle is outlined yellow (red while playing).

## 3. Refine
Each camera section is a normal clip: use the [[tools|Rolling Edit tool]] to move cuts, right-click ▸ Switch to Camera, or pick the angle in **Effect Controls ▸ Multi-Camera**.`,
    },

    // ------------------------------------------------------------------ Exporting
    {
      id: 'export', cat: 'Exporting', title: 'Exporting a video',
      body: `Press \`⌘M\` or click **Export**.

## The quick way
Click **Export** in the top bar, then **Export** in the dialog. That's it: the whole sequence is exported with the Match Source preset. {{web:Chrome and Edge then ask where to save the file; Safari and Firefox save it to your Downloads folder.|desktop:It goes to your last-used folder (Movies the first time). If a file with that name already exists, Reelsmith picks a new name such as "My Movie (2)" so nothing is overwritten.}}

## Settings
- **Preset:** Match Source, YouTube 1080p or 4K, Shorts/Reels/TikTok (9:16), Instagram Square or Portrait, Vimeo, X 720p, or a small review copy.
- **File name** and **Location:** {{web:type the name; Chrome and Edge let you pick the folder when you click Export (other browsers use Downloads).|desktop:click **Browse…** to choose a folder. Reelsmith remembers it. If you type a name that already exists, it asks before replacing the file.}}
- **Format:** H.264 MP4 (plays everywhere) or WebM.
- **Frame size:** pick **Match sequence** or a standard size from the list — 4K UHD, QHD, Full HD, HD, SD, vertical 9:16 sizes, Square 1:1, Portrait 4:5 or DCI cinema sizes. Choose **Custom…** to type your own width × height. Choosing a preset sets this for you.
- **Quality:** High, Medium or Low (smaller file).
- **Range:** Entire Sequence (default — nothing to set up), Sequence In/Out, the selected clips, or **Custom**. To export only part, drag the orange **In** and **Out** handles on the range bar under Range (the preview shows the frame at the handle) or type the timecodes. You don't need to go back to the timeline.
- **Render:** see [[export-engines|Fast vs. real-time export]].
- **Mute speakers while exporting**{{web:.|desktop: and **Show in Finder when done.**}}

The summary shows the resulting size, range and estimated file size. If the output shape differs from the sequence (for example a 9:16 preset on a 16:9 sequence), the picture is letterboxed — change Sequence Settings to reframe instead.

Click **Export**. A progress window shows the percentage and speed; **Cancel export** stops and removes the partial file.`,
    },
    {
      id: 'export-gif-audio', cat: 'Exporting', title: 'Export a GIF or audio only',
      body: `## Animated GIF
Choose **File ▸ Export as GIF…**. Pick the **Range** (the whole sequence or your In/Out points), the **Size** (320–800 px wide) and the **Frame rate** (10–25 fps), then click **Export GIF**.
- GIFs have no sound and up to 256 colours per frame, so they suit short loops, reactions and screen demos. Keep them short: above about 20 seconds, an MP4 is much smaller.
- Captions and titles that are visible in the Program monitor are included.
- Frames that don't change are merged, so still parts cost almost nothing.

## Audio only
Choose **File ▸ Export Audio…** to save the sound of the sequence — every unmuted audio track with its volume, effects and fades:
- **AAC (.m4a)** — small and plays everywhere (offered when your browser can encode AAC).
- **WAV (.wav)** — uncompressed, for further editing in an audio app.

Muted tracks are left out. To export one part, set In and Out points with \`I\` and \`O\` and choose **Sequence In/Out**.

Both run on your device{{web:, so nothing is uploaded|desktop:}}. See also [[export|Exporting a video]].`,
    },
    {
      id: 'export-engines', cat: 'Exporting', title: 'Fast vs. real-time export',
      body: `## Fast — frame-accurate (default)
Each output frame is built from the exact source frames and encoded directly, and audio is mixed offline. It is usually many times faster than real time and gives the exact duration.

## Real-time
The sequence is played and recorded, so a 5-minute edit takes 5 minutes. Reelsmith switches to this automatically when needed — for example when an audio clip's speed was changed, because pitch-preserving playback is only available in real time. The Export dialog shows a message when this happens.`,
    },

    // ------------------------------------------------------------------ Projects & Saving
    {
      id: 'saving', cat: 'Projects & Saving', title: 'Saving and opening projects',
      body: `- **Save** \`⌘S\`, **Save As** \`⇧⌘S\`, **Open** \`⌘O\`, **New Project** \`⌘N\`.
- Projects are saved as \`.rsproj\` files. They contain your sequences, edits and settings and point to your media files by location; media is not copied.
- The project name in the top bar can be edited by clicking it. A dot after the name in the window title means unsaved changes.
- When you close the window or open another project with unsaved changes, Reelsmith asks whether to save.

Projects from earlier Reelsmith versions open normally.`,
    },
    {
      id: 'autosave', cat: 'Projects & Saving', title: 'Autosave and recovery',
      body: `Reelsmith saves a recovery copy of your work a moment after every change. If the app quits unexpectedly, the next start offers **Restore**. Choose it to continue where you left off, then save the project normally. Closing the app normally clears the recovery copy.`,
    },


    // ------------------------------------------------------------------ Tier 1 additions
    {
      id: 'video-effects', cat: 'Effects & Transitions', title: 'Crop, Transform, Drop Shadow and other video effects',
      body: `Find these in **Effects ▸ Video Effects**. Drag one onto a clip (or select the clip and press **Apply**); its controls appear in Effect Controls and a chip appears at the top so you can remove it.

- **Crop:** trims Left, Top, Right and Bottom (in %). The cropped area becomes transparent, so the track below shows through. Crop values can be keyframed.
- **Transform (Skew):** slants the picture with Skew X and Skew Y.
- **Drop Shadow:** color, opacity, distance, direction and softness. Great on titles, shapes and keyed footage.
- **Horizontal Flip / Vertical Flip:** mirrors the picture.
- **Sharpen:** increases edge detail (Amount).
- **Mosaic:** pixelates the clip — combine it with a [[masks|mask]] and [[tracking|tracking]] to hide a face or a licence plate.`,
    },
    {
      id: 'ultra-key', cat: 'Effects & Transitions', title: 'Green screen (Ultra Key)',
      body: `1. Put the background on **V1** and the green-screen clip on **V2** above it.
2. Drag **Effects ▸ Video Effects ▸ Ultra Key (Green Screen)** onto the V2 clip.
3. In **Effect Controls ▸ Ultra Key**, click **Pick from Program**, then click the green background in the Program monitor.
4. Adjust **Tolerance** until the background disappears, **Softness** to smooth the edges, and **Spill suppression** to remove the green tint on hair and edges.

Any colour can be keyed (blue screens too). Use **Crop** or a **mask** to remove parts of the set outside the green area.`,
    },
    {
      id: 'remove-background', cat: 'Effects & Transitions', title: 'Remove an image background (logos)',
      body: `Make the background of a logo or graphic transparent so it sits on top of your video.

1. Right-click the image in the **Project** panel or on the timeline and choose **Remove Background…** (or select the clip and click **Remove Background…** in Effect Controls).
2. The background colour is detected from the image border. The preview shows the result on a checkerboard (transparent areas).
3. Adjust if needed:
   - **Click the preview** on the background to pick its colour; **Shift+click** to add more colours (for gradients or two-tone backgrounds).
   - **Remove:** *Background touching the edges* keeps white parts inside the logo; *This colour everywhere* also clears holes inside letters such as **O**, **A** and **e**.
   - **Tolerance:** raise it when bits of background remain; lower it if parts of the logo disappear.
   - **Edge softness:** smooth, anti-aliased edges with no coloured fringe.
   - **Trim transparent edges:** crop the empty border around the logo.
4. Click **Remove Background**.

A new transparent PNG is {{web:created|desktop:saved to **Movies/Reelsmith/Cutouts**}} and added to the Project panel; the clip switches to it. The original file is not changed and stays in the Project panel. Press ⌘Z to go back.

This works by colour, not AI, so it is best for logos and graphics on a plain background. For a person or object in a photo, use a [[masks|mask]] instead. Images that already have transparency (PNG, WebP) keep it.`,
    },
    {
      id: 'creative-transitions', cat: 'Effects & Transitions', title: 'Fun & shape transitions',
      body: `Besides the classic transitions, **Effects ▸ Video Transitions** has Flash, Blur Dissolve, Zoom In/Out, Spin, Whip Pan, Push Right/Up/Down, Bounce In, Clock Wipe, Split (Barn Door), Diamond Iris, Heart Iris, Film Burn, Glitch and Pixelate.

**Effects ▸ Shape Transitions** (Color Bars, Diagonal Stripes, Rising Bars, Spinning Squares, Circle Burst) sweep coloured shapes over the cut; the picture changes while the screen is covered. Click the transition on the timeline to change its **Main / Second / Edge colours** and duration in Effect Controls.

Drag any transition onto the cut between two clips, exactly like Cross Dissolve.`,
    },
    {
      id: 'animations', cat: 'Effects & Transitions', title: 'Clip & text animations (In, Out, Loop)',
      body: `Animate how a clip, title or sticker **appears** (In), **leaves** (Out) and **moves while on screen** (Loop).

- Drag an item from **Effects ▸ Animations — In / Out / Loop** onto a clip, or select the clip and choose in **Effect Controls ▸ Animation**.
- In: Fade, Pop, Zoom In/Out, Slide (4 directions), Fade Up, Blur In, Spin, Bounce, Flip, Stamp, **Typewriter** (titles).
- Out: the same moves in reverse, plus **Erase** for titles.
- Loop: Pulse, Heartbeat, Wobble, Float, Jiggle, Rotate, Flicker — set **speed** and **strength**.

Each clip has one In, one Out and one Loop animation; choosing another replaces it.`,
    },
    {
      id: 'creative-effects', cat: 'Effects & Transitions', title: 'Creative effects, filters, titles and stickers',
      body: `## Creative Effects
Camera Shake, Zoom Punch (beat), RGB Split, Glitch, VHS Retro, Film Grain, Dreamy Glow, Cinematic Bars, Light Leak, Flash at Start, **Background Blur Fill** (fills empty space around vertical or small video with a blurred copy), Mirror, Split Screen ×3, Heartbeat Vignette, **Kaleidoscope**, **Zoom Blur**, **Duotone Pop**, **Old Film** (sepia, scratches, dust and flicker), **Strobe Flash**, **Spotlight**, and the particle effects **Snowfall**, **Sparkles** and **Rain**. Set each one's strength in **Effect Controls ▸ Creative Effects**.

**Funny:** Zoom Punch, Camera Shake, Glitch, Stamp/Pop animations, stickers and sound effects. **Elegant:** Dreamy Glow, Light Leak, Film Grain, Cinematic Bars, Fade Up titles, Elegant Serif text. **Professional:** Lower Third, Background Blur Fill, Cinematic filter, Auto Duck.

## Filters
One-click looks: Cinematic, Teal & Orange, Golden Hour, Moody, Film Fade, Noir, Pastel, Neon Night, Retro 70s, Clean & Crisp, Frost, Dramatic B&W. A new filter replaces the previous one; fine-tune in Lumetri Color.

## Titles, text styles and stickers
- **Title Templates** add ready-made animated titles at the playhead: Big Bold Intro, Elegant Title, Lower Third, Meme Top Text, Neon Sign, Typewriter Text, Call to Action, Chapter Title, Countdown 3-2-1, Breaking News Bar. Double-click the text in the Program monitor to edit it.
- **Text Styles** restyle a selected title: Meme, Bold Pop, Neon, Neon Blue, Elegant Serif, Cinematic Wide, Subtitle Box, Comic, Typewriter, Minimal.
- **Stickers** add an animated emoji (pops in and wobbles). Move and resize it in the Program monitor.`,
    },
    {
      id: 'voice-sfx', cat: 'Audio', title: 'Voice effects, sound effects and auto ducking',
      body: `## Voice effects
Drag from **Effects ▸ Voice Effects** onto an audio clip: Chipmunk, Deep Voice, Monster, Robot, Telephone, Old Radio, Megaphone, Echo, Big Hall. One per clip. They play live and are included in exports.

## Sound effects
**Effects ▸ Sound Effects** has 19 original sounds (Subscribe Click + Bell, Whoosh, Riser, Pop, Ding, Boing, Camera Shutter, Impact Boom, Laser Zap, Record Scratch, Tick Tock, Slide Whistles, Bubble Blips, Notification Chime, Wrong Buzzer, Ta-da!, Applause, Drum Roll + Crash). Double-click to add at the playhead on a free audio track, or drag onto the timeline. They are generated {{web:in your browser and added to the Project panel.|desktop:on your Mac and saved to **Movies/Reelsmith/Sound Effects**.}}

## Auto Duck Music Under Voice
Put the voice-over or dialogue and the music on different audio tracks. Select the **music** clip and apply **Effects ▸ Smart Audio ▸ Auto Duck Music Under Voice**: the music is lowered by 14 dB wherever someone speaks, with smooth ramps (volume keyframes you can adjust).`,
    },
    {
      id: 'text-effects', cat: 'Effects & Transitions', title: '3D, gradient, halftone and animated text',
      body: `Select a title and open **Effect Controls ▸ Text Effects**:
- **Gradient fill** (two colours and an angle).
- **Highlight words:** wrap words in asterisks, e.g. \`trending *text effect*\`, to give them the **Highlight colour**.
- **3D extrude** with depth, direction and side colour.
- **Halftone dots** inside the letters.
- **Outer outline** (a second outline around the first) and **Offset shadow** (a solid coloured copy behind the text).
- **Glow** and **Letter spacing**.

One-click styles in **Effects ▸ Text Styles**: Retro Pop 3D, Epic Gold 3D, Gradient Bold, Two-Tone, Sticker Outline, Candy 3D, Gold Luxe, Comic Burst 3D (plus Meme, Neon, Elegant…). Applying a style replaces the previous effects.

**Word and letter animations** (Effects ▸ Animations, text only): Words Pop, Words Rise, Words Slide + Blur, Words Focus, Letters Pop, Letters Drop, Letters Fade Up; loops Letter Wave and Word Bounce.

Ready-made: **Title Templates ▸** Retro Pop 3D Title, Epic 3D Title, Two-Tone Title + Label, Kinetic Words, Smooth Spaced Title, Bouncy Words.`,
    },
    {
      id: 'video-bg', cat: 'Effects & Transitions', title: 'Remove a video background (white, black or green)',
      body: `Put the overlay video (for example a "subscribe" animation on a white background) on **V2** above your main video, then right-click it ▸ **Remove Background** (or click **Remove Background** in Effect Controls).

Reelsmith detects the background colour from the frame edges and sets up **Ultra Key** for you:
- **Mode:** *Brightness* for white, black or grey backgrounds; *Colour* for green or blue screens.
- **Keep inside (edges only):** removes only the background that touches the frame edges, so white text or icons inside the animation stay visible.
- **Tolerance / Softness:** raise Tolerance if a light fringe remains; lower it if parts of the animation disappear.

Then scale and move the clip (Effect Controls ▸ Motion or drag it in the Program monitor) to place it, e.g. at the bottom of the frame.`,
    },
    {
      id: 'library', cat: 'Effects & Transitions', title: 'Library: subscribe, like, bell and other graphics',
      body: `The **Library** tab (next to Project, Effects and Captions) has ready-made animated graphics: **Subscribe Button**, **Like Button**, **Comment Button**, **Notification Bell**, **Like · Comment · Subscribe**, **Follow Button**, **Share Button**, **Click Cursor**, **Bouncing Arrow** and **Progress Bar**.

- Hover a card to preview it; **double-click** to add it at the playhead, or **drag** it onto a timeline track.
- It goes on V2 or higher (above your video), sized and placed for your frame (including vertical 9:16).
- Change the **text** (e.g. SUBSCRIBE → JOIN) and **colours** in Effect Controls ▸ Graphic; move and resize it in the Program monitor; drag the clip edges to change its length. The Progress Bar fills over the length of its clip.
- In/Out/Loop animations and effects work on graphics too.
- The **Subscribe Button** comes with a matching sound (a click, then a bell ringing as the bell icon swings) on an audio track, linked to the graphic so they move together. Don't want it? Select the graphic, press **⌘L** (Unlink), then click the audio clip and press **Delete** — or Option-click the audio clip and delete it.

The graphics are drawn by Reelsmith (no video files), so they stay sharp at any size and have transparent backgrounds — no background removal needed.`,
    },
    {
      id: 'adjustment-layers', cat: 'Effects & Transitions', title: 'Adjustment layers',
      body: `An adjustment layer applies its effects to **everything on the tracks below it** — one place to grade or stylise a whole section.

- Create one with the adjustment-layer button in the Project panel or **Sequence ▸ Add Adjustment Layer**. It goes on a free track above V1 at the playhead.
- Stretch it over the clips you want to affect and apply effects or Lumetri Color to it.
- Opacity blends the effect in; masks limit it to part of the frame.`,
    },
    {
      id: 'time-tools', cat: 'Editing in the Timeline', title: 'Freeze frames, reverse and speed ramps',
      body: `## Freeze frame
- **Add Frame Hold** (right-click a video clip, or Effect Controls ▸ Time): from the playhead to the end of the clip becomes a still of that frame.
- **Insert Frame Hold Segment:** inserts a 2-second still at the playhead and pushes everything later.

## Reverse
Right-click ▸ **Reverse Clip** (or Effect Controls ▸ Time ▸ ◀◀ Reverse). Reversed video previews by stepping frames; the export is smooth and frame-accurate, and reversed sound is rendered in the export.

## Speed ramps (time remapping)
In **Effect Controls ▸ Time**, click the stopwatch next to **Time Remap Speed**, move the playhead and change the value to add keyframes — for example 100% → 300% → 100% for a quick speed-up in the middle. Clips with time remapping show **TR** on the timeline. For a constant change use [[clip-commands|Speed/Duration]].`,
    },
    {
      id: 'editing-commands', cat: 'Editing in the Timeline', title: 'Lift, Extract, Q/W, Match Frame and track targeting',
      body: `## Track targeting
Click a track's name badge (V1, A1 …) to target or untarget it. Filled badges are targeted. Targeted tracks are used by Lift, Extract, Q/W, Match Frame and Insert/Overwrite from the Source monitor.

## Lift and Extract
Set In and Out points (\`I\`, \`O\`), then:
- \`;\` **Lift:** removes that range from targeted tracks and leaves a gap.
- \`'\` **Extract:** removes it and closes the gap.

## Ripple trim to the playhead
- \`Q\`: removes from the start of the clip under the playhead up to the playhead, closing the gap.
- \`W\`: removes from the playhead to the end of that clip, closing the gap.

## Match Frame
\`F\` opens the clip under the playhead in the Source monitor at the exact same frame.

## Three-point editing
In the Source monitor mark In (and optionally Out). If the sequence has an In point, Insert (\`,\`) / Overwrite (\`.\`) place the clip there; if the sequence also has an Out point and the source has no Out, the sequence range sets the length.

## Replace Edit
Hold \`Alt\` while dropping media onto a timeline clip to replace its footage but keep its position, length and effects. Or load a clip in the Source monitor and right-click a timeline clip ▸ **Replace With Source Monitor Clip**.`,
    },
    {
      id: 'audio-mixing', cat: 'Audio', title: 'Audio Gain, Pan and the Audio Track Mixer',
      body: `## Audio Gain
Select audio clips and press \`G\` (or Effect Controls ▸ Audio ▸ **Audio Gain**) to set the level in dB. Gain is applied before Volume keyframes and fades and shows on the clip (for example **+3.0dB**).

## Pan
Effect Controls ▸ Audio ▸ **Pan**: −100 is hard left, 100 hard right. Pan can be keyframed.

## Audio Track Mixer
Open the **Audio Track Mixer** tab (top-left panel). Each audio track has a pan slider, **M** (mute), **S** (solo), a **mic** button for [[voiceover|voice-over]], a volume fader in dB (double-click for 0 dB) and a level meter. The **Master** fader sets the level of the whole mix, including exports.

## Normalize Loudness
Select audio clips ▸ right-click ▸ **Normalize Loudness…** and choose a target: −14 LUFS (YouTube, Spotify), −16 LUFS (Apple), −23 LUFS (EBU broadcast) or −24 LUFS (US broadcast). Reelsmith measures each clip with the standard broadcast method and sets its Audio Gain.`,
    },
    {
      id: 'audio-effects', cat: 'Audio', title: 'Audio effects: EQ, compressor, noise removal',
      body: `Find these in **Effects ▸ Audio Effects** and drag them onto an audio clip. Their controls appear in Effect Controls ▸ Audio; remove one with its chip.

- **Parametric EQ (3-band):** Low (200 Hz), Mid (adjustable frequency) and High (4 kHz), ±18 dB. Cut lows to reduce boominess, lift highs for clarity.
- **Compressor:** evens out loud and quiet parts. Threshold, Ratio and Make-up gain.
- **High-Pass (remove rumble):** cuts traffic, wind and handling noise below the cut-off (80 Hz is a good start for voice).
- **DeHum:** removes 50 Hz or 60 Hz electrical hum and its harmonics.
- **Noise Gate:** silences the clip while it is quieter than the threshold — removes background hiss between words.

Effects are heard during playback and included in the export.`,
    },
    {
      id: 'voiceover', cat: 'Audio', title: 'Recording a voice-over',
      body: `1. Put the playhead where the narration should start.
2. Click the **mic** button on an audio track header (or in the Audio Track Mixer). Allow microphone access the first time.
3. The program plays while you speak. Program sound is muted during recording to avoid echo — use headphones to hear yourself.
4. Press \`Space\` or click the mic again to stop.

The recording is {{web:|desktop:saved in **Movies ▸ Reelsmith ▸ Recordings**, }}added to the Project panel and placed on that track at the starting point.`,
    },
    {
      id: 'captions', cat: 'Captions', title: 'Captions and subtitles',
      body: `## Auto-generate captions from speech
1. Open the **Captions** tab (bottom-left panel) and click **Auto-generate** (or **Sequence ▸ Auto-generate Captions…**).
2. Choose what to transcribe (entire sequence, In/Out or selected clips), the **spoken language** (or Detect automatically) and the **accuracy** model. Tick **Translate the captions into English** if you want English captions from another language.
3. Click **Generate**. The first time, the chosen model downloads once (sizes below).

Speech recognition runs entirely on your computer — nothing is uploaded. Always read through the result: names, technical words and less common languages may need corrections.

{{web:The caption engine downloads once, the first time you click Generate (Tiny ~45 MB, Base ~80–95 MB, Small ~250–330 MB), and stays in your browser. To free the space, choose **Captions ▸ Remove Caption Engine…**; it downloads again next time you need it. Chrome and Edge use your graphics chip and are fastest.|desktop:Speech recognition uses whisper.cpp. Models: Base ~150 MB, Small ~490 MB, Medium ~1.5 GB, Large v3 Turbo ~1.6 GB. whisper.cpp must be installed once: in Terminal, from the Reelsmith folder, run \`./scripts/build-whisper.sh\` (needs \`brew install cmake\`), or simply \`brew install whisper-cpp\`. The Auto-generate window shows these instructions until it finds the engine. On Apple Silicon a 10-minute video takes roughly 1–3 minutes with the Small model.}}

## Show or hide captions
Untick **Show captions** in the Captions panel (or click **CC** in the Program monitor) to hide them from the picture without deleting them. Hidden captions are left out of exports by default; choose **Burn into the video** in the Export dialog to include them anyway.

## Add captions by hand
Click **Add at playhead**, then type the words. Each caption appears as a purple clip on the **CC** track above the video, where you can move and trim it like any clip. Edit the start and end timecodes in the panel, or double-click a caption clip to edit its text.

## Import and export .srt
- **Import .srt** adds captions from a subtitle file.
- **Export .srt** saves the sequence's captions as a subtitle file for YouTube, Vimeo and other players.

## Style
**Style…** sets the text size, colour, background box, opacity, position (bottom or top) and margin for the whole sequence.

## In exports
The Export dialog's **Captions** option can burn them into the picture, save a matching \`.srt\` file next to the video, do both, or leave them out.`,
    },
    {
      id: 'performance', cat: 'Getting Started', title: 'Smooth playback: playback resolution and proxies',
      body: `## Playback resolution
In the Program monitor, set **Full**, **1/2** or **1/4**. Lower settings render a smaller picture while playing for smooth playback of heavy edits; paused frames and exports are always full quality.

## Proxies
Proxies are small copies of your video files used only for editing.
1. Select video files in the Project panel ▸ right-click ▸ **Create Proxies** (or **Sequence ▸ Create Proxies for Selected Media**).
2. When they are ready, **Proxies** in the Program monitor turns on. Click it to switch between proxies and originals.

{{web:Proxies are available in the desktop app only.|desktop:Proxies are saved in **Movies ▸ Reelsmith ▸ Proxies**.}} Exports always use the full-quality original files. Items with a proxy show **proxy ✓** in the Project panel.`,
    },

    // ------------------------------------------------------------------ Reference
    {
      id: 'shortcuts', cat: 'Reference', title: 'Keyboard shortcuts',
      body: `## Playback
- \`Space\` play / pause
- \`J\` \`K\` \`L\` shuttle reverse / stop / forward (press \`L\` again for faster)
- \`←\` \`→\` one frame (\`Shift\` = 5 frames)
- \`↑\` \`↓\` previous / next edit point
- \`Home\` \`End\` start / end of sequence

## Tools
- \`V\` Selection · \`A\` Track Select Forward · \`⇧A\` Track Select Backward
- \`B\` Ripple Edit · \`N\` Rolling Edit · \`R\` Rate Stretch · \`C\` Razor
- \`Y\` Slip · \`U\` Slide · \`H\` Hand · \`Z\` Zoom
- \`T\` Type · \`P\` Pen

## Editing
- \`⌘K\` split selected / under playhead · \`⇧⌘K\` split all tracks
- \`Delete\` clear · \`⇧Delete\` ripple delete
- \`⌘C\` \`⌘X\` \`⌘V\` copy / cut / paste at playhead
- \`⌘L\` link / unlink · \`⇧E\` enable / disable · \`⌘R\` speed / duration
- \`⌥←\` \`⌥→\` nudge · \`Alt\`-drag duplicate · \`Alt\`-click one side of a linked clip
- \`⌘D\` video transition · \`⇧⌘D\` audio transition
- \`⌘Z\` undo · \`⇧⌘Z\` redo · \`⌘A\` select all · \`Esc\` deselect
- \`S\` snapping
- \`;\` lift · \`'\` extract · \`Q\` \`W\` ripple trim previous / next edit to playhead
- \`F\` match frame · \`G\` audio gain · \`Alt\`-drop replace clip

## Markers and In/Out
- \`M\` add / edit marker · \`⇧M\` next marker
- \`I\` \`O\` In / Out · \`⇧I\` \`⇧O\` go to In / Out · \`⌥X\` clear

## Source monitor
- \`I\` \`O\` mark In / Out · \`,\` insert · \`.\` overwrite

## Multicam
- \`1\`–\`9\` switch / cut camera · \`⇧0\` Multi-Camera view

## View
- \`=\` \`-\` zoom · \`\\\` fit sequence · \`⌘\` + scroll zoom at pointer

## Project
- \`⌘N\` new · \`⌘O\` open · \`⌘S\` save · \`⇧⌘S\` save as
- \`⌘I\` import · \`⌘M\` export · \`⌘T\` new title · \`F1\` Help`,
    },
    {
      id: 'faq', cat: 'Reference', title: 'Troubleshooting and FAQ',
      body: `## I applied a transition but nothing happened
Transitions only change the first or last second of a clip. Move the playhead to the clip's start or end, or watch the automatic preview. See [[effects-vs-transitions|Effects vs. transitions]].

## I applied an effect but the picture didn't change
Make sure the playhead is over the clip and the clip isn't hidden by a clip on a higher track. Check the effect chip at the top of Effect Controls. Effects for audio (Boost, Audio Fade) don't change the picture.

## A file won't import
Its codec probably isn't supported (for example ProRes or AVI). Convert it to H.264 MP4.

## My clips are red and striped
The media is offline. See [[offline-media|Offline media and relinking]].

## A video has no sound in the timeline
The file has no audio track (it shows **no audio** in the Project panel), the audio track is muted, another track is soloed, or the audio clip was unlinked and deleted.

## Playback stutters
Lower the number of simultaneous video tracks, close the Multi-Camera view when not needed, or use smaller proxy-resolution files. Export is not affected — it is frame-accurate.

## Export says "The export range is empty"
Choose **Entire Sequence**, or drag the In/Out handles on the range bar in the Export dialog to choose the part you want. Press \`⌥X\` in the timeline to clear old In/Out points. See [[markers-inout|Markers and sequence In/Out]].

## Export used real time instead of Fast
A clip needed real-time processing (for example audio with changed speed). The message in the Export dialog explains why.

## The timeline keeps zooming by itself
That's Auto-fit keeping all clips visible. Zoom manually to turn it off, or click **Auto-fit**. See [[zoom-scroll|Zooming]].

## I deleted something by mistake
Press \`⌘Z\`. Up to 300 steps can be undone.`,
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
