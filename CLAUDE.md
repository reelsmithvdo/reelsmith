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
  - `src/js/intro.js` + `#intro` in `index.html` — Photopea-style first-visit landing (real content for Google);
    one click opens the editor and is remembered; `?…`/`#…` links skip it.
  - `src/js/web.js` `W.TOOLS` — task guides opened by `/?tool=<id>` from the tool pages; `src/js/templates.js` —
    project templates on the start screen; `src/js/quicktools.js` — Export as GIF / Export Audio (M4A, WAV).
- `content/tools/*.md` — tool pages (`/tools/<slug>/`); front matter `tool:` must be an id in `W.TOOLS` (build checks).
- `scripts/shoot.js` — real editor screenshots for the site: `npx electron scripts/shoot.js <scene>` (scenes in
  `scripts/shots/scenes.js`; `preview` scenes go to a temp folder).
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

## Blog admin (`admin/`, Next.js 16 + MongoDB Atlas) — local only so far
- Run: `cd admin && npm run dev` → http://localhost:3100/admin (login = ADMIN_EMAIL / ADMIN_PASSWORD in
  `admin/.env.local`, never committed). Database `reelsmith` on cluster0.8pbzwag (Atlas network access 0.0.0.0/0).
- Login account: MongoDB `users` (_id 'owner', email + scrypt passwordHash, version `v`); created on first sign-in
  from ADMIN_EMAIL/ADMIN_PASSWORD_HASH, then changed in Settings (a password change signs out other devices).
- Collections: `posts` (section blog|tutorial, status draft|published, publishAt → scheduled), `categories`,
  `media` (GridFS images, resized to WebP in the browser), `settings`.
- **Publishing is automatic** (`admin/lib/autopublish.js`): publishing/updating/unpublishing/deleting a live post or
  renaming a used category rebuilds the site in the background; scheduled posts go live via the hourly cron.
  Settings ▸ "Rebuild site now" is only a manual fallback.
  After a publish that commits, the sitemap is re-sent to Google Search Console automatically (≥3 min later, by
  the next publish or the hourly cron; `settings.site.sitemapPending` / `lastSitemapSubmit`, shown in Settings).
- The rebuild (Settings fallback button, or automatic) writes `content/posts.json` + images to `src/assets/blog/`, then runs
  `scripts/build-site.js` → static pages. Going live = commit + push. The Markdown files in content/blog and
  content/tutorials are only the fallback / original import source (`npm run import-content`).
- SEO panel: Yoast-style checks in `admin/lib/seo-analysis.js` (from the Algo Matryx admin), score in `lib/score.js`.
- Google data: Search Console works; GA4 needs the Analytics **Data** API enabled + the service account as Viewer.
- **Online hosting (free, Cloudflare — the equivalent of Algo Matryx on Vercel):** Worker `reelsmith-admin`
  (Next.js via OpenNext, `admin/wrangler.jsonc`, ~1.6 MB gzip < 3 MB free limit), deployed by Workers Builds
  from this repo (root dir `admin`, build `npx opennextjs-cloudflare build`, deploy `npx opennextjs-cloudflare deploy`).
  No public URL of its own: the website Worker forwards `/admin*` through the `ADMIN` service binding.
  Secrets on reelsmith-admin: MONGODB_URI, ADMIN_PASSWORD_HASH (salt:scrypt), SESSION_SECRET, GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY, GITHUB_TOKEN (Contents read/write on this repo).
- Online "Publish site" commits content/posts.json + new images to GitHub; the website build
  (`build.command` in wrangler.jsonc) regenerates the pages. The website Worker's hourly cron calls publish
  (header x-rs-scheduler, stripped from visitor requests) so scheduled posts go live on time.
- Cloudflare gotchas: tokens must be added as **Secret** (plain-text Variables are wiped on every deploy);
  `/admin*` and `/api/*` are in `run_worker_first` (wrangler.jsonc) — without it browser visits get the 404 page.
  One GitHub token `reelsmith-admin-publish` (Contents on reelsmith) is on reelsmith-admin; `reelsmith-feedback`
  (Issues on reelsmith-feedback) is on the website Worker. Test live with `-H 'Sec-Fetch-Mode: navigate'`.
- **Local work uses a separate database:** `admin/.env.local` has `MONGODB_DB=reelsmith_dev` (live = `reelsmith`).
  The live hourly publish reads `reelsmith`, so local edits never go live by themselves. Before pushing locally
  prepared content: `cd admin && node --env-file=.env.local scripts/promote-dev.mjs --yes` (copies posts,
  categories, media to live), then commit + push.
- On Cloudflare each request opens its own MongoDB connection (Workers can't share sockets across requests).
- Local Cloudflare test: `cd admin && npm run cf:build && npx wrangler dev` (secrets in `admin/.dev.vars`).

## Writing content (for Google)
- New tutorial: copy a file in `content/tutorials/`, change the front matter (`title`, `description`,
  `date`, `order`, optional `image`), write steps that match the real UI labels, run `npm run site`.
- Link to docs with `[[doc-id|text]]`; the build fails on broken links.
- Only describe features that exist; check labels in the app first.

## Owner preferences
- Match Premiere's UX where it makes sense; fewest possible steps for the user.
- Test with real input (mouse, keyboard, touch) — not just function calls.
- Plain, friendly wording in the UI and docs; no platform logos or copied templates.
