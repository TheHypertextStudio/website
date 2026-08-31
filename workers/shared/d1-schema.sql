-- Webmentions storage. Apply with:
--   wrangler d1 execute hypertext-studio --file workers/shared/d1-schema.sql
-- Idempotent: every CREATE uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS webmentions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source       TEXT NOT NULL,
  target       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  -- mention_type: one of 'reply' | 'like' | 'repost' | 'bookmark' | 'mention'.
  -- Derived from microformats on the source: u-in-reply-to / u-like-of /
  -- u-repost-of / u-bookmark-of pointing at the target. Default 'mention'
  -- covers bare links and unclassified cases.
  mention_type TEXT NOT NULL DEFAULT 'mention',
  author_url   TEXT,
  author_name  TEXT,
  author_photo TEXT,
  content      TEXT,
  content_html TEXT,
  published_at TEXT,
  received_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at  TEXT,
  UNIQUE (source, target)
);

CREATE INDEX IF NOT EXISTS idx_webmentions_target ON webmentions(target);
CREATE INDEX IF NOT EXISTS idx_webmentions_status ON webmentions(status);
CREATE INDEX IF NOT EXISTS idx_webmentions_type ON webmentions(mention_type);

-- Bootstrap inspects an existing webmentions table and adds mention_type before
-- applying this file. Keeping the migration in bootstrap prevents CREATE INDEX
-- from running against an older table that does not yet have the column.

-- Notes published via Micropub (mirrored to repo via GitHub API; this row is
-- a small audit trail so the worker can dedupe and report back).
CREATE TABLE IF NOT EXISTS notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  url          TEXT NOT NULL,
  commit_sha   TEXT,
  posted_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
