export interface WebmentionRow {
  id: number;
  source: string;
  target: string;
  status: 'pending' | 'verified' | 'rejected';
  mention_type: 'reply' | 'like' | 'repost' | 'bookmark' | 'mention';
  author_url: string | null;
  author_name: string | null;
  author_photo: string | null;
  content: string | null;
  content_html: string | null;
  published_at: string | null;
  received_at: string;
  verified_at: string | null;
}

export interface MicropubBindings {
  GITHUB_TOKEN: string;
  INDIEAUTH_ENDPOINT: string;
  GITHUB_REPO: string;
  NOTES_PATH: string;
  DEFAULT_BRANCH: string;
}

export interface OembedBindings {
  SITE_URL: string;
  SITE_NAME: string;
}

export interface WebmentionBindings {
  DB: D1Database;
}

// Re-export for convenience in worker entry files.
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
