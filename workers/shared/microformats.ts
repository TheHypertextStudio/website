/**
 * Microformats helpers shared between the webmention worker and any consumer
 * that needs to reason about source pages. Built on `microformats-parser`,
 * which handles nested h-cites, implied properties, e-content extraction,
 * and absolute-URL resolution against the source's base URL.
 *
 * See docs/indieweb.md for the conceptual frame.
 */

import { mf2, type MicroformatRoot } from 'microformats-parser';

export type MentionType = 'reply' | 'like' | 'repost' | 'bookmark' | 'mention';

export const MENTION_TYPES: ReadonlySet<MentionType> = new Set([
  'reply',
  'mention',
  'like',
  'repost',
  'bookmark',
]);

const TYPE_TO_PROPERTY: ReadonlyArray<readonly [MentionType, string]> = [
  ['reply', 'in-reply-to'],
  ['like', 'like-of'],
  ['repost', 'repost-of'],
  ['bookmark', 'bookmark-of'],
];

export interface HEntry {
  authorName: string | null;
  authorUrl: string | null;
  authorPhoto: string | null;
  contentText: string | null;
  contentHtml: string | null;
  published: string | null;
}

const EMPTY_ENTRY: HEntry = {
  authorName: null,
  authorUrl: null,
  authorPhoto: null,
  contentText: null,
  contentHtml: null,
  published: null,
};

/**
 * Single-pass parse of a source page's microformats. The worker calls this
 * once per received webmention; the type classifier and h-entry extractor
 * share the same parsed tree.
 */
export function analyzeSource(
  html: string,
  target: string,
  sourceUrl: string,
): { type: MentionType; entry: HEntry } {
  const items = mf2(html, { baseUrl: sourceUrl }).items;
  const entries = collectHEntries(items);
  return {
    type: classifyFromEntries(entries, target),
    entry: extractEntry(entries),
  };
}

// Back-compat exports — keep so existing call sites and unit tests keep
// working while sharing the single-pass parse internally.
export function classifyMentionType(html: string, target: string, sourceUrl: string): MentionType {
  return analyzeSource(html, target, sourceUrl).type;
}

export function parseHEntry(html: string, sourceUrl: string): HEntry {
  return analyzeSource(html, '', sourceUrl).entry;
}

function classifyFromEntries(entries: MicroformatRoot[], target: string): MentionType {
  for (const [type, prop] of TYPE_TO_PROPERTY) {
    for (const entry of entries) {
      const values = entry.properties[prop] ?? [];
      if (values.some((v) => valueMatchesUrl(v, target))) return type;
    }
  }
  return 'mention';
}

function extractEntry(entries: MicroformatRoot[]): HEntry {
  const [entry] = entries;
  if (!entry) return EMPTY_ENTRY;
  const { authorName, authorUrl, authorPhoto } = readAuthor(entry);
  const { contentText, contentHtml } = readContent(entry);
  const published = firstString(entry.properties.published);
  return { authorName, authorUrl, authorPhoto, contentText, contentHtml, published };
}

// ---------- helpers ---------------------------------------------------------

function collectHEntries(items: MicroformatRoot[]): MicroformatRoot[] {
  const out: MicroformatRoot[] = [];
  const visit = (item: MicroformatRoot): void => {
    if (item.type?.includes('h-entry')) out.push(item);
    item.children?.forEach(visit);
  };
  items.forEach(visit);
  return out;
}

function readAuthor(entry: MicroformatRoot): {
  authorName: string | null;
  authorUrl: string | null;
  authorPhoto: string | null;
} {
  const raw = entry.properties.author?.[0];
  if (typeof raw === 'string') {
    return { authorName: raw, authorUrl: null, authorPhoto: null };
  }
  if (isMicroformat(raw)) {
    return {
      authorName: firstString(raw.properties.name),
      authorUrl: firstString(raw.properties.url),
      authorPhoto: firstString(raw.properties.photo),
    };
  }
  return { authorName: null, authorUrl: null, authorPhoto: null };
}

function readContent(entry: MicroformatRoot): {
  contentText: string | null;
  contentHtml: string | null;
} {
  const raw = entry.properties.content?.[0] ?? entry.properties.summary?.[0];
  if (typeof raw === 'string') return { contentText: raw, contentHtml: null };
  if (raw && typeof raw === 'object') {
    const c = raw as { value?: string; html?: string };
    return { contentText: c.value ?? null, contentHtml: c.html ?? null };
  }
  return { contentText: null, contentHtml: null };
}

function valueMatchesUrl(value: unknown, target: string): boolean {
  if (typeof value === 'string') return value === target;
  if (isMicroformat(value)) {
    // h-cite and similar nested objects expose either `value` (the URL the
    // sender hyperlinked) or a `url` property inside `properties`.
    const v = (value as unknown as { value?: unknown }).value;
    if (typeof v === 'string' && v === target) return true;
    const urls = value.properties.url ?? [];
    return urls.some((u) => typeof u === 'string' && u === target);
  }
  return false;
}

function isMicroformat(v: unknown): v is MicroformatRoot {
  return (
    !!v &&
    typeof v === 'object' &&
    'properties' in v &&
    typeof (v as { properties: unknown }).properties === 'object'
  );
}

function firstString(values: unknown[] | undefined): string | null {
  if (!values) return null;
  const first = values[0];
  return typeof first === 'string' ? first : null;
}
