import type { APIRoute } from 'astro';
import { serializeAtom, FEED_EPOCH, type FeedMeta } from '@/lib/feed';
import { buildFeedItems } from '@/lib/feed-collections';
import { SITE_URL, SITE_NAME, SITE_LOCALE } from '@/consts';
import t from '@/i18n';

export const GET: APIRoute = async () => {
  const items = await buildFeedItems();

  const meta: FeedMeta = {
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
    description: t.site.description,
    feedUrl: new URL('/atom.xml', SITE_URL).toString(),
    language: SITE_LOCALE,
    buildDate: items[0]?.publishedAt ?? FEED_EPOCH,
  };

  return new Response(serializeAtom(items, meta), {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
