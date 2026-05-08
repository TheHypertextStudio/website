/**
 * Astro-aware feed item builder. Kept separate from src/lib/feed.ts so the
 * pure serializers there stay unit-testable without Vitest having to resolve
 * `astro:content` (a runtime virtual module that only exists inside Astro).
 *
 * Imported by the three feed route files only.
 */

import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { FEED_ITEM_LIMIT, noteSummary, noteTitle, type FeedItem } from '@/lib/feed';
import { SITE_URL, SITE_NAME } from '@/consts';

export async function buildFeedItems(): Promise<FeedItem[]> {
  // Defensive: a missing or empty collection shouldn't crash the route.
  // Matches the pattern in src/pages/llms-full.txt.ts.
  const [studies, notes] = await Promise.all([
    getCollection('studies').catch(() => [] as CollectionEntry<'studies'>[]),
    getCollection('notes').catch(() => [] as CollectionEntry<'notes'>[]),
  ]);

  const studyItems: FeedItem[] = studies
    .filter((s) => !s.data.draft)
    .map((s) => ({
      kind: 'study' as const,
      id: s.id,
      url: new URL(`/studies/${s.id}`, SITE_URL).toString(),
      title: s.data.title,
      summary: s.data.summary,
      publishedAt: s.data.publishedAt,
      modifiedAt: s.data.modifiedAt,
      tags: s.data.tags,
      inReplyTo: s.data.inReplyTo,
      syndicatedTo: s.data.syndicatedTo,
      author: s.data.author,
    }));

  const noteItems: FeedItem[] = notes.map((n) => ({
    kind: 'note' as const,
    id: n.id,
    url: new URL(`/notes/${n.id}`, SITE_URL).toString(),
    title: noteTitle(n.data.publishedAt),
    summary: noteSummary(n.body ?? ''),
    publishedAt: n.data.publishedAt,
    tags: n.data.tags,
    inReplyTo: n.data.inReplyTo,
    syndicatedTo: n.data.syndicatedTo,
    author: SITE_NAME,
  }));

  return [...studyItems, ...noteItems]
    .sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf())
    .slice(0, FEED_ITEM_LIMIT);
}
