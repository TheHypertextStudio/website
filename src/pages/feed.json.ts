import type { APIRoute } from 'astro';
import { buildFeedMeta, serializeJsonFeed } from '@/lib/feed';
import { buildFeedItems } from '@/lib/feed-collections';

export const GET: APIRoute = async () => {
  const items = await buildFeedItems();

  return new Response(serializeJsonFeed(items, buildFeedMeta('/feed.json', items)), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
