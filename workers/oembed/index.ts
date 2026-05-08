/**
 * GET /oembed?url=...   →   oEmbed JSON
 *
 * Returns a richer payload than Open Graph for embed-aware platforms (Discord,
 * WordPress, Slack-via-unfurl). Per https://oembed.com/.
 */

import type { OembedBindings } from '../shared/types';

const ALLOWED_HOST = 'hypertext.studio';

export default {
  async fetch(req: Request, env: OembedBindings): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.pathname !== '/oembed') {
      return new Response('Not Found', { status: 404 });
    }

    const target = url.searchParams.get('url');
    if (!target) return json({ error: 'missing url parameter' }, 400);
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return json({ error: 'invalid url' }, 400);
    }
    if (parsed.host !== ALLOWED_HOST) {
      return json({ error: `oEmbed not provided for ${parsed.host}` }, 404);
    }

    // Fetch and extract title + description from the actual page so we get
    // per-page payloads without maintaining a separate index.
    let title = env.SITE_NAME;
    let description = '';
    try {
      const res = await fetch(parsed.toString(), {
        cf: { cacheTtl: 600, cacheEverything: true } as RequestInitCfProperties,
      });
      if (res.ok) {
        const html = await res.text();
        title = match(html, /<title>([^<]+)<\/title>/i) ?? title;
        description = match(html, /<meta name="description" content="([^"]+)"/i) ?? '';
      }
    } catch {
      /* fallback to defaults */
    }

    const payload = {
      version: '1.0',
      type: 'rich',
      provider_name: env.SITE_NAME,
      provider_url: env.SITE_URL,
      title,
      author_name: env.SITE_NAME,
      author_url: env.SITE_URL,
      html: `<blockquote><p><a href="${parsed.toString()}">${escape(title)}</a></p>${
        description ? `<p>${escape(description)}</p>` : ''
      }<footer>— ${env.SITE_NAME}</footer></blockquote>`,
      thumbnail_url: `${env.SITE_URL}/og.png`,
      thumbnail_width: 1200,
      thumbnail_height: 630,
      cache_age: 86400,
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

function match(haystack: string, re: RegExp): string | null {
  return haystack.match(re)?.[1]?.trim() ?? null;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
