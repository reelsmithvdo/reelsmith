-- Reelsmith admin database (Cloudflare D1 / SQLite). Replaces MongoDB (2026-11-16).
-- Times are milliseconds since 1970 (UTC). Ids are 24-character hex strings (the old MongoDB ids were kept).

-- Blog posts and tutorials. The searchable fields are columns; everything else is JSON in `doc`.
CREATE TABLE posts (
  id           TEXT PRIMARY KEY,
  section      TEXT NOT NULL,              -- 'blog' | 'tutorial'
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL,              -- 'draft' | 'published' (published + future publish_at = scheduled)
  publish_at   INTEGER NOT NULL,
  category     TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  doc          TEXT NOT NULL DEFAULT '{}', -- excerpt, meta, keywords, featuredImage, seoScore, order, author…
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  UNIQUE (section, slug)
);
CREATE INDEX posts_updated ON posts (updated_at DESC);
CREATE INDEX posts_category ON posts (category);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);

-- Media library. The image bytes are split into pieces (a D1 row can hold at most 2 MB).
CREATE TABLE media (
  id           TEXT PRIMARY KEY,
  filename     TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  alt          TEXT NOT NULL DEFAULT '',
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  uploaded_at  INTEGER NOT NULL
);
CREATE INDEX media_uploaded ON media (uploaded_at DESC);
CREATE TABLE media_chunks (
  media_id TEXT NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  n        INTEGER NOT NULL,
  data     BLOB NOT NULL,
  PRIMARY KEY (media_id, n)
);

-- Small JSON documents: settings ('site') and the owner account ('owner').
CREATE TABLE settings (id TEXT PRIMARY KEY, doc TEXT NOT NULL DEFAULT '{}');
CREATE TABLE users (id TEXT PRIMARY KEY, doc TEXT NOT NULL DEFAULT '{}');
