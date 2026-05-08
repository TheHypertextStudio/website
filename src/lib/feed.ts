/**
 * Build-time feed serializers. Three Astro API routes (feed.xml, atom.xml,
 * feed.json) call buildFeedItems() and pass the result through one of the
 * pure serializers below.
 *
 * The serializers are deliberately separated from the Astro runtime: they
 * accept plain FeedItem[] and return strings, which makes them unit-testable
 * with hand-built fixtures and immune to changes in astro:content's surface.
 *
 * Format choices, in case anyone later asks "why not @astrojs/rss":
 *  - Atom and JSON Feed would have to be hand-rolled regardless; doing all
 *    three the same way is fewer moving parts.
 *  - The codebase already prefers small hand-rolled emitters
 *    (see src/pages/llms-full.txt.ts).
 *  - No new npm dependency for ~250 lines of well-trodden text.
 */

import { isoDate } from '@/i18n/format';
import t from '@/i18n';

export type FeedKind = 'study' | 'note';

export interface FeedItem {
  kind: FeedKind;
  /** Slug from the content collection (entry.id). */
  id: string;
  /** Absolute canonical URL of the item. */
  url: string;
  /**
   * Title for the item. Set to null only when serializing notes into RSS,
   * where omitting <title> is legal (RSS 2.0 requires title or description,
   * not both) and aggregator UIs render better without a fabricated title.
   * Atom and JSON Feed always receive a derived "Note · YYYY-MM-DD" title.
   */
  title: string | null;
  /** Plain-text summary; used as RSS <description>, Atom <summary>, JSON content_text. */
  summary: string;
  publishedAt: Date;
  modifiedAt?: Date;
  tags: string[];
  inReplyTo?: string;
  syndicatedTo: string[];
  author: string;
}

export interface FeedMeta {
  siteName: string;
  siteUrl: string;
  description: string;
  /** Absolute self-URL for the feed (used in <atom:link rel="self"> and JSON feed_url). */
  feedUrl: string;
  language: string;
  /**
   * Last meaningful change to the feed. Should be max(items[].modifiedAt|publishedAt),
   * NOT new Date() — using build time makes every static rebuild look like a content
   * change to aggregators (Feedbin and friends use this for freshness scoring).
   */
  buildDate: Date;
}

const FEED_LIMIT = 20;

/** RFC 4151 tag-URI authority. Stable across rebuilds; do not change without a migration. */
const TAG_AUTHORITY = 'hypertext.studio';
/** Year the studio first published. RFC 4151 ties the URI to a date the authority owned. */
const TAG_YEAR = '2026';

/**
 * Fallback build-date for an empty feed. Stable across rebuilds — using
 * `new Date()` would make every static deploy look like a content change to
 * aggregators. Set to the start of the tag year.
 */
export const FEED_EPOCH = new Date('2026-01-01T00:00:00Z');

// ───────────────────────────────────────────── pure helpers (unit-testable)

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inside CDATA only `]]>` is dangerous; split it across two CDATA sections. */
export function escapeCdata(s: string): string {
  return s.replace(/]]>/g, ']]]]><![CDATA[>');
}

/**
 * RFC 822 / RFC 1123 date for RSS <pubDate>. Date.toUTCString() emits
 * "Mon, 08 Apr 2026 00:00:00 GMT" — RSS feed validators prefer the numeric
 * timezone form, so we convert "GMT" to "+0000".
 */
export function rfc822(d: Date): string {
  return d.toUTCString().replace(/GMT$/, '+0000');
}

/** RFC 3339 / ISO 8601 date for Atom <updated> and JSON Feed date_published. */
export function rfc3339(d: Date): string {
  return d.toISOString();
}

/** RFC 4151 tag URI: `tag:authority,YYYY:specific`. */
export function tagUri(specific: string): string {
  return `tag:${TAG_AUTHORITY},${TAG_YEAR}:${specific}`;
}

/**
 * Derive a short summary for a note (which has no schema title or summary
 * field). Takes the first paragraph, collapses whitespace, truncates to
 * ~200 chars at a word boundary.
 */
export function noteSummary(body: string): string {
  const trimmed = (body ?? '').trim();
  if (!trimmed) return '';
  const firstPara = trimmed
    .split(/\n\s*\n/)[0]!
    .replace(/\s+/g, ' ')
    .trim();
  if (firstPara.length <= 200) return firstPara;
  const cut = firstPara.slice(0, 200);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/** Derived display title for notes (Atom + JSON Feed; RSS gets null). */
export function noteTitle(publishedAt: Date): string {
  return `${t.indieweb.post.noteLabel} · ${isoDate(publishedAt)}`;
}

// ───────────────────────────────────────────────────── RSS 2.0 serializer

export function serializeRss(items: FeedItem[], meta: FeedMeta): string {
  const channelLines: string[] = [
    `    <title>${escapeXml(meta.siteName)}</title>`,
    `    <link>${escapeXml(meta.siteUrl)}</link>`,
    `    <description>${escapeXml(meta.description)}</description>`,
    `    <language>${escapeXml(meta.language)}</language>`,
    `    <lastBuildDate>${rfc822(meta.buildDate)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml"/>`,
  ];
  for (const item of items) channelLines.push(serializeRssItem(item));

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">`,
    `  <channel>`,
    ...channelLines,
    `  </channel>`,
    `</rss>`,
  ].join('\n');
}

function serializeRssItem(item: FeedItem): string {
  const lines: string[] = [`    <item>`];
  if (item.title !== null) {
    lines.push(`      <title>${escapeXml(item.title)}</title>`);
  }
  lines.push(
    `      <link>${escapeXml(item.url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
    `      <pubDate>${rfc822(item.publishedAt)}</pubDate>`,
    `      <dc:creator>${escapeXml(item.author)}</dc:creator>`,
    `      <description><![CDATA[${escapeCdata(item.summary)}]]></description>`,
  );
  for (const tag of item.tags) {
    lines.push(`      <category>${escapeXml(tag)}</category>`);
  }
  lines.push(`    </item>`);
  return lines.join('\n');
}

// ─────────────────────────────────────────────────── Atom 1.0 serializer

export function serializeAtom(items: FeedItem[], meta: FeedMeta): string {
  const headLines: string[] = [
    `  <title>${escapeXml(meta.siteName)}</title>`,
    `  <subtitle>${escapeXml(meta.description)}</subtitle>`,
    `  <id>${tagUri('feed')}</id>`,
    `  <link rel="self" href="${escapeXml(meta.feedUrl)}" type="application/atom+xml"/>`,
    `  <link rel="alternate" href="${escapeXml(meta.siteUrl)}" type="text/html"/>`,
    `  <updated>${rfc3339(meta.buildDate)}</updated>`,
    `  <author><name>${escapeXml(meta.siteName)}</name><uri>${escapeXml(meta.siteUrl)}</uri></author>`,
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:thr="http://purl.org/syndication/thread/1.0" xml:lang="${escapeXml(meta.language)}">`,
    ...headLines,
    ...items.map(serializeAtomEntry),
    `</feed>`,
  ].join('\n');
}

function serializeAtomEntry(item: FeedItem): string {
  // Atom requires a non-empty <title>. Notes get a derived label even though RSS omits it.
  const title = item.title ?? noteTitle(item.publishedAt);
  const updated = item.modifiedAt ?? item.publishedAt;
  const lines: string[] = [
    `  <entry>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <id>${tagUri(`${item.kind}/${item.id}`)}</id>`,
    `    <link rel="alternate" href="${escapeXml(item.url)}" type="text/html"/>`,
    `    <published>${rfc3339(item.publishedAt)}</published>`,
    `    <updated>${rfc3339(updated)}</updated>`,
    `    <author><name>${escapeXml(item.author)}</name></author>`,
  ];
  if (item.inReplyTo) {
    lines.push(`    <thr:in-reply-to ref="${escapeXml(item.inReplyTo)}"/>`);
  }
  for (const url of item.syndicatedTo) {
    // Non-standard rel; recognised by POSSE-aware readers, ignored elsewhere.
    lines.push(`    <link rel="syndication" href="${escapeXml(url)}"/>`);
  }
  for (const tag of item.tags) {
    lines.push(`    <category term="${escapeXml(tag)}"/>`);
  }
  lines.push(`    <summary type="text">${escapeXml(item.summary)}</summary>`, `  </entry>`);
  return lines.join('\n');
}

// ───────────────────────────────────────────── JSON Feed 1.1 serializer

export function serializeJsonFeed(items: FeedItem[], meta: FeedMeta): string {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.siteName,
    home_page_url: meta.siteUrl,
    feed_url: meta.feedUrl,
    description: meta.description,
    language: meta.language,
    authors: [{ name: meta.siteName, url: meta.siteUrl }],
    items: items.map((item) => {
      const out: Record<string, unknown> = {
        id: item.url,
        url: item.url,
        title: item.title ?? noteTitle(item.publishedAt),
        content_text: item.summary,
        date_published: rfc3339(item.publishedAt),
        authors: [{ name: item.author }],
      };
      if (item.modifiedAt) out.date_modified = rfc3339(item.modifiedAt);
      if (item.tags.length) out.tags = item.tags;
      // Custom extensions per JSON Feed 1.1 — must be underscore-prefixed.
      if (item.inReplyTo) out._indieweb = { in_reply_to: item.inReplyTo };
      if (item.syndicatedTo.length) out._syndication = item.syndicatedTo;
      return out;
    }),
  };
  return JSON.stringify(feed, null, 2);
}

/** Exported for tests and for any caller that wants to know the cap. */
export const FEED_ITEM_LIMIT = FEED_LIMIT;
