import type { APIRoute } from 'astro';
import { buildFeedMeta, serializeRss } from '@/lib/feed';
import { buildFeedItems } from '@/lib/feed-collections';

export const GET: APIRoute = async () => {
  const items = await buildFeedItems();
  // RSS 2.0 lets <item> omit <title> when <description> is present, and
  // aggregator UIs render notes better without a fabricated headline.
  const itemsForRss = items.map((i) => (i.kind === 'note' ? { ...i, title: null } : i));

  return new Response(serializeRss(itemsForRss, buildFeedMeta('/feed.xml', items)), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
