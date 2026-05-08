/**
 * GET /api/poem  →  { poem: string }
 *
 * Fetches the studio's current line of writing from a DNS TXT record on
 * hypertext.studio. Records prefixed with `studio:` win; the prefix is
 * stripped. Returns an empty string when no record is set, so the footer
 * band hides itself rather than displaying a fallback.
 *
 * Add the record at the registrar:
 *   hypertext.studio.  TXT  "studio:<your line of writing>"
 *
 * Cache TTL: 1 hour at the worker plus DNS TTL.
 */

interface DnsAnswer {
  data: string;
}

interface DnsResponse {
  Answer?: DnsAnswer[];
}

const ZONE = 'hypertext.studio';
const CACHE_TTL_SECONDS = 3600;

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    if (url.pathname !== '/api/poem') return new Response('Not Found', { status: 404 });

    const cacheKey = new Request(url.toString(), req);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    let poem = '';
    try {
      const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${ZONE}&type=TXT`, {
        headers: { Accept: 'application/dns-json' },
      });
      if (dnsRes.ok) {
        const data = (await dnsRes.json()) as DnsResponse;
        const records = (data.Answer ?? [])
          .map((a) => a.data.replace(/^"|"$/g, ''))
          .filter((d) => d.startsWith('studio:'))
          .map((d) => d.slice('studio:'.length).trim());
        if (records[0]) poem = records[0];
      }
    } catch {
      /* return empty string; the footer band will hide itself */
    }

    const res = new Response(JSON.stringify({ poem }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'Access-Control-Allow-Origin': '*',
      },
    });
    await cache.put(cacheKey, res.clone());
    return res;
  },
};
