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

export interface MicropubBindings extends MicropubEnv {
  GITHUB_TOKEN: string;
}

export type OembedBindings = OembedEnv;

export type WebmentionBindings = WebmentionEnv;

// Re-export for convenience in worker entry files.
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
