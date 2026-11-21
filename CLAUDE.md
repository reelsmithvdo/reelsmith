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
3. Later, maybe: more tutorials and languages (Photopea has 67 translated homepages, `/l/<lang>/` + hreflang).
   (Desktop installers are dropped.)

## Status (last updated 2026-11-18) — read this to pick up where we left off
Everything below is **live and pushed** (main = origin/main; last full `npm test` 2026-11-18: 376 passed, 0 failed).
- **Website (94 URLs):** homepage = editor with a Photopea-style first-visit intro; `/features/`, `/tools/` (15 task
  pages), `/tutorials/` (6), `/blog/` (3), `/docs/` (60), `/contact/`, about/privacy/terms. Sitemap + robots
  (`Disallow: /api/`, `/admin`). Articles get heading anchors, "On this page", "Related guides", image sizes.
- **Editor features added 2026-11-09/10:** Export as GIF, Export Audio (M4A/WAV), 9 creative effects (Kaleidoscope,
  Zoom Blur, Duotone Pop, Old Film, Strobe Flash, Spotlight, Snowfall, Sparkles, Rain), 6 project templates on the
  start screen, `/?tool=<id>` task guides, Shift-click range selection in the Project panel, Contact in Help menu.
- **Blog admin** is live at reelsmithapp.com/admin (see below). 13 posts live on 2026-11-18 (GIF post went live that day).
- **Contact form** live: `/contact/` → `POST /api/contact` (worker) → Brevo → reelsmith.vdo@gmail.com (Reply-To =
  visitor). Owner added `BREVO_API_KEY` (API key, xkeysib-…) and verified sender "Reelsmith <reelsmith.vdo@gmail.com>".
  Not yet confirmed with a real message — ask the owner whether a test from the live form arrived.
- **Search Console:** sitemap resubmitted 2026-11-09 (94 URLs); from now on the admin re-sends it automatically.
- **2026-11-16 (pushed):** site search like algomatryx.com (`src/search.js`, header button
  "Search ⌘K", also `/` and Ctrl+K; index `src/search-index.json` built by `npm run site`; on the editor page only in the
  intro; GA event `search`). AdSense prep (see "Ads / AdSense" below). Admin dashboard Analytics: realtime visitors,
  deltas vs previous 30 days, daily chart, channels, sources, site-search terms. Blog posts 2026-11-14/15 published.

- **Blog schedule (in the live D1, publish automatically via the hourly cron at ~:17):** 2026-11-20 add music; then every
  2 days at 10:00 Asia/Dhaka, 2026-11-22 … 2026-12-20: color correct, blur a face, speed ramp, voiceover, picture-in-picture,
  transitions, background noise, multicam, logo/watermark, photo slideshow, split screen, freeze frame, video intro,
  editing shortcuts, edit on phone; then (topics from Search Console queries, added 2026-11-21) 12-22 remove audio, 12-24 add
  text without watermark, 12-26 combine videos into one Reel, 12-28 blurred background, 12-30 reverse a video. Scripts: `admin/scripts/content/post-<date>-*.mjs` (re-run with `--live` to update one).
  No post links to a post that isn't live yet on its own date — keep it that way when editing.
- **Facebook auto-share (live 2026-11-21):** `admin/lib/facebook.js`, called at the end of every online publish (scheduler
  at :17 and :47). Shares **every** live post once to the Facebook Page "Reelsmith" (id 1333250273214703; Meta app
  "Reelsmith Auto Post" 1189536450129110, Live): **max 2 per day, ≥ 6 h apart, 10:00–22:00 Dhaka** — owner's rule, so it
  never looks like spam. Order: posts live < 2 days first (shared ~10:47 on their day), then older posts oldest-first.
  Text = title + meta description; link → Facebook builds the preview (featured image) from the page's og: tags. Only
  when the page answers 200; 3 tries on errors. State: D1 settings id 'facebook' {shared, last}; Settings ▸ Connections
  shows status + queue length. Secrets FB_PAGE_ID + FB_PAGE_TOKEN (never-expiring Page token) on reelsmith-admin.
  **Missed shares are logged** (settings 'facebook'.log; failed 3× or not shared within a day of going live). The owner's
  rule: **at the start of every work session, run `cd admin && node --env-file=.env.local scripts/facebook.mjs --live`**
  and publish anything MISSED with `--share-missed` (or `--share blog/<slug>`; needs FB_PAGE_ID/FB_PAGE_TOKEN in the
  environment — ask the owner for them, e.g. in the gitignored creds.txt). Missed posts are also shown in Settings.
  Older (already live) posts can instead be scheduled in Facebook's own **Scheduled** tab (owner's wish, 2026-11-21:
  the 13 posts live before then were scheduled 22–30 Nov, 10:30/16:30 Dhaka) with `--schedule-backlog` (`--dry-run` first).
  New posts can't be scheduled on Facebook in advance (Facebook builds the link preview when the post is created, and the
  page doesn't exist yet) — they're shared directly ~10:47 on their day.
- **Post images are static files, not in D1:** featured/inline images of script-made posts are `src/assets/shots/<name>.jpg`
  (committed; posts store only the path). They don't appear in the admin Media library. They must be pushed before
  the post's publish date. Admin-uploaded images are different (D1 `media`, written to `src/assets/blog/` on publish).
- **Screenshots with real footage (2026-11-18):** CC0/public-domain photos listed in `scripts/shots/footage.json`
  (Wikimedia Commons, licence checked by `node scripts/shots/get-footage.js`, downloaded to `scripts/shots/footage/`,
  gitignored) → `SH.photo({ key, … })` turns a photo into a slowly moving MP4 (optional speech audio). Blog scenes are in
  `scripts/shots/scenes-blog.js` and `scenes-blog2.js` (`npx electron scripts/shoot.js <scene>`); the phone image = scenes phone-a/b/c
  (`RS_SHOT_DIR=…`) combined by `npx electron scripts/shots/combine-phone.js`. Owner wants images that look real and differ
  from each other — no drawn/cartoon footage, no AI-looking designs.
- **Known app issues found 2026-11-18 (not fixed):** Export dialog overflows on phone width (Range select and Duration cut
  off); Speed/Duration with "Ripple" and several selected clips on one track leaves gaps (selected clips aren't shifted).

## Next steps (suggested, not started)
- **First, every session:** check Facebook missed shares (see Status ▸ Facebook auto-share) and publish them.
- New posts: scheduled until 2026-12-30 (see Status). Next batch after that: **3–4 strong posts a week**, not
  mass-produced (Google's scaled-content policy, AdSense "low value" rejections). Topics already covered: see
  `admin/scripts/content/` — avoid duplicates. Optionally check after each date that the post went live.
- Search Console 2026-11-18: 86 of 97 sitemap URLs indexed; the rest "Discovered – not indexed" (normal for a new site).
  Owner requests indexing by hand (~10/day).
- Owner to do by hand: Search Console ▸ URL Inspection ▸ Request indexing for key pages (~10/day);
  `www` → root Redirect Rule in Cloudflare; confirm the contact form email arrives.
- Later: Brevo domain authentication for reelsmithapp.com (better deliverability) → set `CONTACT_FROM` to
  e.g. contact@reelsmithapp.com in wrangler.jsonc. Ads (see Roadmap 2). Homepage translations.
- Known flake: touch-mode tests occasionally fail when a tap lands while the page is still busy (long-press
  logic in touch.js); re-run before assuming a regression.

## Ads / AdSense (prepared 2026-11-16)
- One switch: `content/site.json` `"adsenseClient": "ca-pub-…"` then `npm run site`. Empty = no ad code at all.
  Set = `<meta name="google-adsense-account">` on every page (incl. the editor homepage, for AdSense site verification),
  `src/ads.txt`, CSP opened for Google ad hosts, and `<meta name="rs-ads" content="auto">` on website pages only.
- `src/consent.js` `loadAds()` loads AdSense Auto ads only on pages with rs-ads (never the editor), only on the live
  domain, only after the visitor allows Advertising.
- Privacy Policy has the Advertising section AdSense requires (Google/third-party cookies, Ads Settings opt-out);
  About explains Algo Matryx + how the site stays free.
- Owner steps: sign up at adsense.google.com (Reelsmith email), add site reelsmithapp.com, give Claude the ca-pub ID →
  set it, test, push → in AdSense click Verify (meta tag or ads.txt) → Request review. After approval: AdSense ▸ Privacy &
  messaging ▸ GDPR message (Google-certified CMP required for EEA/UK/CH ads).

## Accounts and services (all on the Reelsmith email)
| What | Where |
|---|---|
| Email | reelsmith.vdo@gmail.com (shown on About / Privacy / Terms, app About box) |
| Code | github.com/reelsmithvdo/reelsmith (branch `main`); desktop-only snapshot: branch `desktop`, tag `desktop-v1.0` |
| Bug reports / feature requests | private repo github.com/reelsmithvdo/reelsmith-feedback (issues created by the Worker; secret `GITHUB_TOKEN` in Cloudflare) |
| Contact form email | Brevo (account on the Reelsmith email), transactional API; secret `BREVO_API_KEY` on the `reelsmith` Worker; vars `CONTACT_TO`/`CONTACT_FROM` in wrangler.jsonc |
| Database | **Cloudflare D1** `reelsmith` (id 2fc36bb5-…, free: 5 GB), binding `DB` on reelsmith-admin; local copy in `admin/.wrangler/state`. Moved from MongoDB Atlas on 2026-11-16; MongoDB code, driver and env vars removed. Owner deletes the Atlas cluster and the `MONGODB_URI` secret on reelsmith-admin |
| Hosting | Cloudflare Workers: `reelsmith` (website: static `src/` + `worker/index.js` for `/api/feedback`, `/api/contact`, `/admin*` → `ADMIN` binding, hourly cron) and `reelsmith-admin` (blog admin). Every push to `main` deploys both (~1–2 min) |
| Domain | reelsmithapp.com (Cloudflare Registrar). `www` → root redirect still to be set up (Rules ▸ Redirect from WWW to root) |
| YouTube | https://www.youtube.com/@ReelSmithVdo (name "Reelsmith", banner/description/links set 2026-11-09) |
| Facebook page | https://www.facebook.com/reelsmithvdo/ (new posts auto-shared once FB_PAGE_ID/FB_PAGE_TOKEN are set) |
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
- `content/` — website text: `pages/`, `tools/`, `tutorials/`, `blog/` (Markdown with front matter). Blog and
  tutorials actually come from `content/posts.json` (written by the admin from the D1 database); the Markdown files
  in `content/blog` and `content/tutorials` are only the original import/fallback.
- `scripts/build-site.js` — builds `/features/`, `/tools/…`, `/docs/…`, `/tutorials/…`, `/blog/…`, `/contact/`,
  legal pages, `sitemap.xml`, `robots.txt` into `src/`, and fingerprints scripts (`?v=hash`).
- `src/contact.js` — contact form script; `worker/index.js` `contact()` sends it with Brevo.
- Images: editor screenshots in `src/assets/shots/` (made with `scripts/shoot.js`, scenes in `scripts/shots/scenes.js` and
  `scenes-blog.js`; real-photo footage via `scripts/shots/get-footage.js`); images uploaded in the admin
  are stored in D1 (`media` + `media_chunks`, compressed to WebP ≤ ~400 KB in the browser, 2 MB server cap) and written to
  `src/assets/blog/` on publish.
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

## Blog admin (`admin/`, Next.js 16 + Cloudflare D1) — live at https://reelsmithapp.com/admin
- Local: `cd admin && npm run dev` → http://localhost:3100/admin (env in `admin/.env.local`, never committed;
  uses a **local copy of D1** in `admin/.wrangler/state` via OpenNext's dev hook in next.config.mjs). Live uses the D1
  database `reelsmith`. Schema: `admin/migrations/*.sql` (`npx wrangler d1 migrations apply reelsmith --local|--remote`).
- Claude must not type the owner's password: the owner signs in; Claude can then use the signed-in browser.
- Login account: D1 `users` (id 'owner', JSON doc with email + scrypt passwordHash, version `v`); created on first sign-in
  from ADMIN_EMAIL/ADMIN_PASSWORD_HASH, then changed in Settings (a password change signs out other devices).
- Collections: `posts` (section blog|tutorial, status draft|published, publishAt → scheduled), `categories`,
  `media` + `media_chunks` (images split into ≤900 KB pieces; D1 rows max 2 MB), `settings`. Code: `lib/db.js`
  (all/first/run/batch, getDoc/setDoc), `lib/posts.js`, `lib/media.js`. Posts: columns + JSON `doc` for other fields.
- **Publishing is automatic** (`admin/lib/autopublish.js`): publishing/updating/unpublishing/deleting a live post or
  renaming a used category rebuilds the site in the background; scheduled posts go live via the hourly cron.
  Settings ▸ "Rebuild site now" is only a manual fallback.
  After a publish that commits, the sitemap is re-sent to Google Search Console automatically (≥3 min later, by
  the next publish or the hourly cron; `settings.site.sitemapPending` / `lastSitemapSubmit`, shown in Settings).
- The rebuild (Settings fallback button, or automatic) writes `content/posts.json` + images to `src/assets/blog/`, then runs
  `scripts/build-site.js` → static pages. Going live = commit + push. The Markdown files in content/blog and
  content/tutorials are only the fallback / original import source (the import script was removed 2026-11-16).
- SEO panel: Yoast-style checks in `admin/lib/seo-analysis.js` (from the Algo Matryx admin), score in `lib/score.js`.
- Google data: Search Console works; GA4 needs the Analytics **Data** API enabled + the service account as Viewer.
- **Online hosting (free, Cloudflare — the equivalent of Algo Matryx on Vercel):** Worker `reelsmith-admin`
  (Next.js via OpenNext, `admin/wrangler.jsonc`, ~1.6 MB gzip < 3 MB free limit), deployed by Workers Builds
  from this repo (root dir `admin`, build `npx opennextjs-cloudflare build`, deploy `npx opennextjs-cloudflare deploy`).
  No public URL of its own: the website Worker forwards `/admin*` through the `ADMIN` service binding.
  Secrets on reelsmith-admin: ADMIN_PASSWORD_HASH (salt:scrypt), SESSION_SECRET, GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY, GITHUB_TOKEN (Contents read/write on this repo). Secrets on reelsmith (website):
  GITHUB_TOKEN (Issues on reelsmith-feedback), BREVO_API_KEY. Claude never pastes tokens/keys — the owner does.
- Online "Publish site" commits content/posts.json + new images to GitHub; the website build
  (`build.command` in wrangler.jsonc) regenerates the pages. The website Worker's hourly cron calls publish
  (header x-rs-scheduler, stripped from visitor requests) so scheduled posts go live on time.
- Cloudflare gotchas: tokens must be added as **Secret** (plain-text Variables are wiped on every deploy);
  `/admin*` and `/api/*` are in `run_worker_first` (wrangler.jsonc) — without it browser visits get the 404 page.
  One GitHub token `reelsmith-admin-publish` (Contents on reelsmith) is on reelsmith-admin; `reelsmith-feedback`
  (Issues on reelsmith-feedback) is on the website Worker. Test live with `-H 'Sec-Fetch-Mode: navigate'`.
- **Local work uses a separate database:** the local D1 copy (`npm run dev`, scripts without `--live`). The live hourly
  publish reads the live D1, so local edits never go live by themselves. Scripts reach either database with
  `admin/scripts/d1.mjs` (`useD1()`; `--live` = live D1 — this machine is logged in with `npx wrangler login`, so Claude
  can read/write the live D1 directly; no admin sign-in needed), then use the normal lib code —
  template: `admin/scripts/content/post-2026-11-15-long-video-into-shorts.mjs` (uploads an image + saves a post).
  MongoDB was fully copied to D1 on 2026-11-16 (script removed afterwards; it is in git history: migrate-mongo-to-d1.mjs).
- Local Cloudflare test: `cd admin && npm run cf:build && npx wrangler dev` (secrets in `admin/.dev.vars`).

## Writing content (for Google)
- Blog posts and tutorials: write them in the admin (or with a script through `admin/scripts/d1.mjs` +
  `admin/lib/posts.js` `savePost`, which cleans the HTML and scores it). Aim for SEO score ≥ 85: keyphrase in
  title/first paragraph/some H2s/an image alt, meta description 120–156 chars, 2+ internal links, 1 outbound
  source, a featured image with descriptive alt, FAQ section. Tips are `<blockquote>` (the editor supports it).
- Tool pages: `content/tools/<slug>.md` (front matter `title`, `metaTitle`, `description`, `tool`, `order`,
  `image`, `imageAlt`); the `tool` id needs a guide in `W.TOOLS` (`src/js/web.js`).
- Homepage intro (`src/index.html` `#intro`): keep it short and non-redundant (owner's wish); it links to the tools.
- Link to docs with `[[doc-id|text]]`; the build fails on broken links.
- Only describe features that exist; check labels in the app first.

## Owner preferences
- Owner works locally first and says when to push; when they say "push", run tests, commit, push, then check live.
- Match Premiere's UX where it makes sense; fewest possible steps for the user.
- Test with real input (mouse, keyboard, touch) — not just function calls.
- Plain, friendly wording in the UI and docs; no platform logos or copied templates.
