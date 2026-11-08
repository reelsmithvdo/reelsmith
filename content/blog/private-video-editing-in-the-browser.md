---
title: Why Your Videos Never Leave Your Computer
description: How Reelsmith edits, captions and exports video entirely inside your browser — and why that is faster and more private than uploading.
date: 2026-11-08
---
"Online video editor" usually means "upload your video to someone else's computer". Reelsmith works differently: it is a website, but the editing happens on **your** machine. Here's how, and why it matters.

## The browser has become a video workstation
Modern browsers ship with the building blocks of a video editor:
- **Hardware video decoding and encoding** (WebCodecs) — the same video chips your computer uses to play and record video.
- **The graphics chip** (WebGL and WebGPU) for real-time effects, color correction and compositing.
- **A professional audio engine** (Web Audio) for mixing, EQ, compression and effects.
- **Direct file access** — in Chrome and Edge, a website can read the files you choose and save a new file where you say, with your permission.

Reelsmith uses these directly. When you press play, your browser decodes the frames, Reelsmith composites titles, effects and transitions on the graphics chip, and the result appears in the Program monitor. When you export, the same pipeline runs faster than real time and the encoder writes an MP4 straight to your disk.

## What this means for you
- **Privacy.** Client footage, family videos and unreleased work are never copied to a server.
- **No waiting for uploads.** A 4 GB file is ready to edit the moment you import it.
- **No server-side limits.** File size and length are limited only by your computer.
- **It keeps working when the connection drops.** Once the page has loaded, editing doesn't need the internet.

## What about auto captions?
Speech recognition usually happens in the cloud. In Reelsmith it doesn't. The first time you click **Generate**, your browser downloads an open-source speech model (Whisper) once and keeps it. From then on, your audio is transcribed on your device — it is never sent anywhere. You can remove the model at any time from **Captions ▸ Remove Caption Engine**.

## What *is* stored, and where
- **Projects** you save are kept in your browser's storage on your computer. Use **File ▸ Download Project File** for a backup you can move to another machine.
- **Your media** stays in its original folder. In Chrome and Edge, Reelsmith remembers which files a project uses, so it can reopen them next time after you click **Reconnect files**.

The full details are in our [Privacy Policy](/privacy/).

## The trade-offs
Doing everything locally means your computer does the work. A recent laptop handles 1080p editing comfortably; very long 4K projects are smoother on a desktop with plenty of memory. Chrome and Edge currently offer the best performance and file access; Safari and Firefox work, with exports saved to Downloads.

Ready to try it? [Open the editor](/) — there is nothing to install.
