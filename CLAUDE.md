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

## Status (last updated 2026-11-11) — read this to pick up where we left off
Everything below is **live and pushed** (main = origin/main; last full `npm test`: 362 passed, 0 failed).
- **Website (94 URLs):** homepage = editor with a Photopea-style first-visit intro; `/features/`, `/tools/` (15 task
  pages), `/tutorials/` (6), `/blog/` (3), `/docs/` (60), `/contact/`, about/privacy/terms. Sitemap + robots
  (`Disallow: /api/`, `/admin`). Articles get heading anchors, "On this page", "Related guides", image sizes.
- **Editor features added 2026-11-09/10:** Export as GIF, Export Audio (M4A/WAV), 9 creative effects (Kaleidoscope,
  Zoom Blur, Duotone Pop, Old Film, Strobe Flash, Spotlight, Snowfall, Sparkles, Rain), 6 project templates on the
  start screen, `/?tool=<id>` task guides, Shift-click range selection in the Project panel, Contact in Help menu.
- **Blog admin** is live at reelsmithapp.com/admin (see below). 9 posts rewritten, SEO scores 88–96.
- **Contact form** live: `/contact/` → `POST /api/contact` (worker) → Brevo → reelsmith.vdo@gmail.com (Reply-To =
  visitor). Owner added `BREVO_API_KEY` (API key, xkeysib-…) and verified sender "Reelsmith <reelsmith.vdo@gmail.com>".
  Not yet confirmed with a real message — ask the owner whether a test from the live form arrived.
- **Search Console:** sitemap resubmitted 2026-11-09 (94 URLs); from now on the admin re-sends it automatically.

## Next steps (suggested, not started)
- New posts: on hold by the owner's choice. When resumed: **3–4 strong posts a week**, not mass-produced
  (Google's scaled-content policy, AdSense "low value" rejections). Good topics = the tool pages' search intents.
- Owner to do by hand: Search Console ▸ URL Inspection ▸ Request indexing for key pages (~10/day);
  `www` → root Redirect Rule in Cloudflare; confirm the contact form email arrives.
- Later: Brevo domain authentication for reelsmithapp.com (better deliverability) → set `CONTACT_FROM` to
  e.g. contact@reelsmithapp.com in wrangler.jsonc. Ads (see Roadmap 2). Homepage translations.
- Known flake: touch-mode tests occasionally fail when a tap lands while the page is still busy (long-press
  logic in touch.js); re-run before assuming a regression.

## Accounts and services (all on the Reelsmith email)
| What | Where |
|---|---|
| Email | reelsmith.vdo@gmail.com (shown on About / Privacy / Terms, app About box) |
| Code | github.com/reelsmithvdo/reelsmith (branch `main`); desktop-only snapshot: branch `desktop`, tag `desktop-v1.0` |
| Bug reports / feature requests | private repo github.com/reelsmithvdo/reelsmith-feedback (issues created by the Worker; secret `GITHUB_TOKEN` in Cloudflare) |
| Contact form email | Brevo (account on the Reelsmith email), transactional API; secret `BREVO_API_KEY` on the `reelsmith` Worker; vars `CONTACT_TO`/`CONTACT_FROM` in wrangler.jsonc |
| Database | MongoDB Atlas free (512 MB), cluster0.8pbzwag; DBs `reelsmith` (live) and `reelsmith_dev` (local work) |
| Hosting | Cloudflare Workers: `reelsmith` (website: static `src/` + `worker/index.js` for `/api/feedback`, `/api/contact`, `/admin*` → `ADMIN` binding, hourly cron) and `reelsmith-admin` (blog admin). Every push to `main` deploys both (~1–2 min) |
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
- `content/` — website text: `pages/`, `tools/`, `tutorials/`, `blog/` (Markdown with front matter). Blog and
  tutorials actually come from `content/posts.json` (written by the admin from MongoDB); the Markdown files
  in `content/blog` and `content/tutorials` are only the original import/fallback.
- `scripts/build-site.js` — builds `/features/`, `/tools/…`, `/docs/…`, `/tutorials/…`, `/blog/…`, `/contact/`,
  legal pages, `sitemap.xml`, `robots.txt` into `src/`, and fingerprints scripts (`?v=hash`).
- `src/contact.js` — contact form script; `worker/index.js` `contact()` sends it with Brevo.
- Images: editor screenshots in `src/assets/shots/` (made with `scripts/shoot.js`); images uploaded in the admin
  are stored in MongoDB GridFS (compressed to WebP ≤ ~400 KB in the browser, 2 MB server cap) and written to
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

## Blog admin (`admin/`, Next.js 16 + MongoDB Atlas) — live at https://reelsmithapp.com/admin
- Local: `cd admin && npm run dev` → http://localhost:3100/admin (env in `admin/.env.local`, never committed;
  uses the **`reelsmith_dev`** database). Live uses `reelsmith`. Atlas network access 0.0.0.0/0.
- Claude must not type the owner's password: the owner signs in; Claude can then use the signed-in browser.
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
  GOOGLE_PRIVATE_KEY, GITHUB_TOKEN (Contents read/write on this repo). Secrets on reelsmith (website):
  GITHUB_TOKEN (Issues on reelsmith-feedback), BREVO_API_KEY. Claude never pastes tokens/keys — the owner does.
- Online "Publish site" commits content/posts.json + new images to GitHub; the website build
  (`build.command` in wrangler.jsonc) regenerates the pages. The website Worker's hourly cron calls publish
  (header x-rs-scheduler, stripped from visitor requests) so scheduled posts go live on time.
- Cloudflare gotchas: tokens must be added as **Secret** (plain-text Variables are wiped on every deploy);
  `/admin*` and `/api/*` are in `run_worker_first` (wrangler.jsonc) — without it browser visits get the 404 page.
  One GitHub token `reelsmith-admin-publish` (Contents on reelsmith) is on reelsmith-admin; `reelsmith-feedback`
  (Issues on reelsmith-feedback) is on the website Worker. Test live with `-H 'Sec-Fetch-Mode: navigate'`.
- **Local work uses a separate database:** `admin/.env.local` has `MONGODB_DB=reelsmith_dev` (live = `reelsmith`).
  The live hourly publish reads `reelsmith`, so local edits never go live by themselves. Before pushing locally
  prepared content, copy it to live first — otherwise the live hourly publish rebuilds posts.json from the old
  live posts and undoes the work. `scripts/promote-dev.mjs --yes` (delete + copy) is blocked by Claude's safety
  check; on 2026-11-10 we instead backed up the live posts and updated them in place by `_id` (replaceOne,
  no deletes). Content scripts used: `admin/scripts/content/improve-2026-11*.mjs` (one-off, already applied).
- On Cloudflare each request opens its own MongoDB connection (Workers can't share sockets across requests).
- Local Cloudflare test: `cd admin && npm run cf:build && npx wrangler dev` (secrets in `admin/.dev.vars`).

## Writing content (for Google)
- Blog posts and tutorials: write them in the admin (or in `reelsmith_dev` with a script through
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
