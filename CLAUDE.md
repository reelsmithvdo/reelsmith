# Reelsmith — project guide

Read this first. It records what the product is for, the decisions already made, and how to work on it.

## The goal
A **free online video editor that earns money from ads**, the way photopea.com does for images.
Live at **https://reelsmithapp.com**. Built and credited by **Algo Matryx** (https://algomatryx.com/).

- Premiere-Pro-like editing (timeline, titles, transitions, color, audio, captions, export) — but an
  original product: own design and code, never copied from Adobe or any other editor.
- **Your files never leave your computer**: editing, captions and export run in the browser. This is a
  core selling point — never add uploads of user media.
- **No AI features**, except local Whisper speech-to-text for auto captions (runs on the user's device).
- **Website only (owner's instruction, 2026-11-09): no more work on the desktop app.** Don't test,
  change or plan desktop (Electron) features. The desktop code stays in the repo (and in the `desktop`
  branch / `desktop-v1.0` tag) only as a backup. Phone apps: not planned. The editor is responsive (desktop browsers, iPad,
  phones) from one code base.
- **Costs near zero until it earns**: Cloudflare free plan, nothing heavy in the page (~0.5 MB). Whisper
  models download only when someone generates captions, straight from Hugging Face (not our bandwidth).

## Roadmap
1. **Now – mid-Dec 2026: grow and get indexed by Google.** Publish tutorials and blog posts regularly,
   share the site where creators are, watch Search Console. (Sitemap submitted 2026-11-08; pages indexed
   within a day.)
2. **~30–40 days after 2026-11-09: add ads.** Plan:
   - Apply to Google AdSense (needs real content + some traffic; About, Privacy, Terms and contact exist).
   - Put ads in a reserved area that never covers the editor (Photopea-style right column on wide screens,
     none inside the timeline/monitor; little or nothing on phones).
   - Load ad scripts **only** through `ReelsmithConsent.onChange(c => { if (c.ads) … })` (src/consent.js).
   - For visitors in the EEA/UK/Switzerland Google requires a **Google-certified CMP** — switch to AdSense's
     own "Privacy & messaging" consent message then (our banner can be removed or kept for other regions).
   - Update the Privacy Policy with the ad providers *before* ads go live (the policy promises this).
3. Later, maybe: more tutorials and languages. (Desktop installers are dropped.)

## Accounts and services (all on the Reelsmith email)
| What | Where |
|---|---|
| Email | reelsmith.vdo@gmail.com (shown on About / Privacy / Terms, app About box) |
| Code | github.com/reelsmithvdo/reelsmith (branch `main`); desktop-only snapshot: branch `desktop`, tag `desktop-v1.0` |
| Bug reports / feature requests | private repo github.com/reelsmithvdo/reelsmith-feedback (issues created by the Worker; secret `GITHUB_TOKEN` in Cloudflare) |
| Hosting | Cloudflare Workers project `reelsmith` (static assets from `src/`, `worker/index.js` for `/api/feedback`); every push to `main` deploys in ~1 min |
| Domain | reelsmithapp.com (Cloudflare Registrar). `www` → root redirect still to be set up (Rules ▸ Redirect from WWW to root) |
| YouTube | https://www.youtube.com/@ReelSmithVdo (name "Reelsmith", banner/description/links set 2026-11-09) |
| Facebook page | https://www.facebook.com/reelsmithvdo/ |
| Reddit | https://www.reddit.com/user/reelsmithvdo/ (the Chrome extension cannot open reddit.com — the owner edits it) |
| Google Analytics 4 | Account "Reelsmith", property "reelsmithapp.com" (Bangladesh time, USD), web stream "Reelsmith website", **Measurement ID `G-9Y1ME99DZ9`** (Google tag GTM-N8M82SLF). Loaded by `src/consent.js` only after Analytics consent and only on reelsmithapp.com. Optional data sharing with Google turned off (only Technical support on). |
| Bing Webmaster Tools | site added 2026-11-09 |
| Brand images | `src/assets/brand/` (YouTube banner, Facebook cover, logos, profile picture, favicons) |
| Google Search Console | Domain property `sc-domain:reelsmithapp.com`; service account `reelsmith-seo@reel-smith.iam.gserviceaccount.com` (key stays in ~/Downloads — **never commit it**) |

## How the code is organised
- `src/` — the editor **and** the website (Cloudflare serves this folder as-is). Same files run in the
  desktop app (Electron: `main.js`, `preload.js`).
  - `src/js/web.js` — browser-only parts (menu bar, start screen, projects in IndexedDB, export picker,
    feedback form). Does nothing in the desktop app.
  - `src/js/touch.js` — touch + phone layout (bottom-sheet panels, long-press, gestures).
  - `src/consent.js` — cookie/privacy banner + Google Consent Mode v2 defaults.
  - `src/js/help-content.js` — Help Center articles; `{{web:…|desktop:…}}` picks wording per edition.
- `content/` — website text: `pages/`, `tutorials/`, `blog/` (Markdown with front matter).
- `scripts/build-site.js` — builds `/features/`, `/docs/…`, `/tutorials/…`, `/blog/…`, legal pages,
  `sitemap.xml`, `robots.txt` into `src/`, and fingerprints scripts (`?v=hash`).
- `tests/` — the test suite (see below).

## Workflow (do this every time)
1. Edit. Website only — ignore `main.js` / `preload.js` (desktop app, no longer developed).
2. If you changed `content/`, `help-content.js` or any script/style: `npm run site`.
3. `npm test` — website modes (web, phone, tablet), ~5 min. Must be **0 failed**.
   (`--mode=desktop` tests the desktop app, only when asked.)
   `npm test -- <name>` for one area, `--mode=phone`, `--slow` for real Whisper captions.
   When fixing a bug, add a test for it.
4. Commit, then push to `main` (deploys the live site). Ask the owner before pushing if unsure.
5. Bump `W.VERSION` in `src/js/web.js` for notable releases (shown in bug reports).

## Writing content (for Google)
- New tutorial: copy a file in `content/tutorials/`, change the front matter (`title`, `description`,
  `date`, `order`, optional `image`), write steps that match the real UI labels, run `npm run site`.
- Link to docs with `[[doc-id|text]]`; the build fails on broken links.
- Only describe features that exist; check labels in the app first.

## Owner preferences
- Match Premiere's UX where it makes sense; fewest possible steps for the user.
- Test with real input (mouse, keyboard, touch) — not just function calls.
- Plain, friendly wording in the UI and docs; no platform logos or copied templates.
