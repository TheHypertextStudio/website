import type { APIRoute } from 'astro';
import { serializeRss, FEED_EPOCH, type FeedMeta } from '@/lib/feed';
import { buildFeedItems } from '@/lib/feed-collections';
import { SITE_URL, SITE_NAME, SITE_LOCALE } from '@/consts';
import t from '@/i18n';

export const GET: APIRoute = async () => {
  const items = await buildFeedItems();

  // RSS 2.0 lets <item> omit <title> when <description> is present, and
  // aggregator UIs render notes better without a fabricated headline.
  const itemsForRss = items.map((i) => (i.kind === 'note' ? { ...i, title: null } : i));

  const meta: FeedMeta = {
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
    description: t.site.description,
    feedUrl: new URL('/feed.xml', SITE_URL).toString(),
    language: SITE_LOCALE,
    // Max item date — never new Date(), to avoid spurious "feed updated" signals.
    buildDate: items[0]?.publishedAt ?? FEED_EPOCH,
  };

  return new Response(serializeRss(itemsForRss, meta), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
