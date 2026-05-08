/**
 * Build-time webmention fetcher. Called from [slug].astro frontmatter; the
 * result is rendered into the static HTML, so there is no client-side flash
 * and no JS dependency on the page itself.
 *
 * Failure is silent and returns empty groups. A local build without network
 * access (or with the worker not yet deployed) still succeeds; the citation
 * section simply renders nothing, and the colophon's respond note carries
 * the page on its own.
 */

import { SITE_URL } from '@/consts';

export type MentionType = 'reply' | 'like' | 'repost' | 'bookmark' | 'mention';

export interface Webmention {
  source: string;
  type: MentionType;
  authorName: string | null;
  authorUrl: string | null;
  authorPhoto: string | null;
  content: string | null;
  publishedAt: string | null;
  receivedAt: string;
}

export interface WebmentionGroups {
  /** Replies + bare mentions; rendered as the bibliographic citation list. */
  citations: Webmention[];
  likes: Webmention[];
  reposts: Webmention[];
  bookmarks: Webmention[];
}

const EMPTY: WebmentionGroups = {
  citations: [],
  likes: [],
  reposts: [],
  bookmarks: [],
};

interface RawRow {
  id: number;
  source: string;
  mention_type: MentionType;
  author_name: string | null;
  author_url: string | null;
  author_photo: string | null;
  content: string | null;
  published_at: string | null;
  received_at: string;
}

interface ApiResponse {
  target: string;
  mentions: Record<MentionType, RawRow[]>;
}

// Build-time only: read from Astro's typed env so the override surfaces
// alongside other PUBLIC_* / private vars. Default points at the production
// worker; CI builds and forks can set WEBMENTION_API_URL to an unreachable
// host to force the empty-citation path. See docs/indieweb.md for the
// full configuration story.
const API_BASE =
  import.meta.env.WEBMENTION_API_URL ??
  import.meta.env.PUBLIC_WEBMENTION_API ??
  `${SITE_URL}/webmentions`;

export async function getWebmentions(targetUrl: string): Promise<WebmentionGroups> {
  const url = `${API_BASE}?target=${encodeURIComponent(targetUrl)}`;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as ApiResponse;
    return groupApiResponse(data);
  } catch {
    return EMPTY;
  }
}

function groupApiResponse(data: ApiResponse): WebmentionGroups {
  const byType = data.mentions ?? {};
  const replies = (byType.reply ?? []).map(toWebmention);
  const mentions = (byType.mention ?? []).map(toWebmention);
  return {
    citations: [...replies, ...mentions].sort(byNewestFirst),
    likes: (byType.like ?? []).map(toWebmention),
    reposts: (byType.repost ?? []).map(toWebmention),
    bookmarks: (byType.bookmark ?? []).map(toWebmention),
  };
}

function toWebmention(row: RawRow): Webmention {
  return {
    source: row.source,
    type: row.mention_type,
    authorName: row.author_name,
    authorUrl: row.author_url,
    authorPhoto: row.author_photo,
    content: row.content,
    publishedAt: row.published_at,
    receivedAt: row.received_at,
  };
}

function byNewestFirst(a: Webmention, b: Webmention): number {
  const ad = a.publishedAt ?? a.receivedAt;
  const bd = b.publishedAt ?? b.receivedAt;
  return bd.localeCompare(ad);
}

/**
 * Display helper: domain-only host for source URLs in the citation list.
 * "https://maggieappleton.com/notes/x" → "maggieappleton.com/notes/x".
 * Falls back to the raw string if the URL doesn't parse.
 */
export function displaySource(source: string): string {
  try {
    const u = new URL(source);
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return source;
  }
}

/**
 * Display helper: short author label when h-card author is missing.
 * "https://maggieappleton.com/notes/x" → "maggieappleton.com".
 */
export function authorFallback(source: string): string {
  try {
    return new URL(source).host;
  } catch {
    return source;
  }
}

/**
 * Render an excerpt as an array of paragraphs (preserving double-newline
 * breaks from the source). Returns full content under the extreme-length
 * threshold (default 1500 chars — multiple paragraphs of careful prose).
 *
 * Above the threshold, we keep whole paragraphs while we can, and only fall
 * to within-paragraph truncation at the FIRST sentence boundary that fits.
 * No mid-word cuts in normal cases. The ellipsis is reserved for the genuine
 * worst case — a single uninterrupted paragraph longer than the cap.
 *
 * Empty input returns null so the caller can omit the blockquote entirely
 * rather than render an empty quotation.
 */
export function excerptParagraphs(content: string | null, max = 1500): string[] | null {
  if (!content) return null;
  const paragraphs = content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]*\n[ \t]*|[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return null;

  const joined = paragraphs.join('\n\n');
  if (joined.length <= max) return paragraphs;

  const out: string[] = [];
  let used = 0;
  for (const p of paragraphs) {
    const projected = used + (out.length > 0 ? 2 : 0) + p.length;
    if (projected <= max) {
      out.push(p);
      used = projected;
      continue;
    }
    if (out.length === 0) {
      out.push(truncateAtSentence(p, max));
    }
    break;
  }
  return out.length > 0 ? out : null;
}

function truncateAtSentence(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  // Prefer any sentence boundary over a mid-word ellipsis.
  const sentenceEnd = /[.!?][”’"')\]]?(?=\s|$)/g;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = sentenceEnd.exec(cut)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd > 0) return cut.slice(0, lastEnd).trimEnd();
  // No sentence boundary at all in the window: fall back to a word boundary
  // with an explicit ellipsis. Ellipsis is reserved for this genuine outlier.
  const lastSpace = cut.lastIndexOf(' ');
  const fallback = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${fallback.trimEnd()}…`;
}
