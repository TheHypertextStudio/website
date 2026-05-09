import type { APIRoute } from 'astro';
import { buildFeedMeta, serializeAtom } from '@/lib/feed';
import { buildFeedItems } from '@/lib/feed-collections';

export const GET: APIRoute = async () => {
  const items = await buildFeedItems();

  return new Response(serializeAtom(items, buildFeedMeta('/atom.xml', items)), {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
