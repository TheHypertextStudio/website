CREATE TABLE IF NOT EXISTS webmentions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source       TEXT NOT NULL,
  target       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
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
