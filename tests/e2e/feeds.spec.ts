import { expect, test } from '@playwright/test';

/**
 * The Playwright webServer runs `pnpm dev:astro` with HYPERTEXT_INCLUDE_FIXTURES=1,
 * so the studies + notes collections each contain one fixture entry:
 *   - studies/curfew-launch.mdx    publishedAt 2026-04-08 (date-only → 00:00:00Z)
 *   - notes/2026-04-08-on-finishing.mdx  publishedAt 2026-04-08T18:00:00Z
 * The note's later timestamp on the same calendar day means it sorts first.
 */

const STUDY_URL = 'https://hypertext.studio/studies/curfew-launch';
const NOTE_URL = 'https://hypertext.studio/notes/2026-04-08-on-finishing';

test.describe('Feed endpoints (with fixtures)', () => {
  test('feed.xml is RSS 2.0 carrying both fixture URLs', async ({ request }) => {
    const res = await request.get('/feed.xml');
    expect(res.status()).toBe(200);
    // Cloudflare Pages serves the configured Content-Type via public/_headers
    // in production. Astro preview falls through to its default mime table
    // (`text/xml` for `.xml`), so tolerate any flavor of XML content-type;
    // the body assertions below are the load-bearing contract.
    expect(res.headers()['content-type']).toMatch(/xml/);

    const body = await res.text();
    expect(body).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain(STUDY_URL);
    expect(body).toContain(NOTE_URL);
    expect(body).toContain('<atom:link');
  });

  test('atom.xml is well-formed XML', async ({ page, request }) => {
    const res = await request.get('/atom.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);

    const body = await res.text();
    expect(body).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
    expect(body).toContain(STUDY_URL);
    expect(body).toContain(NOTE_URL);

    // Validate well-formedness via the browser's DOMParser. Returns true when
    // there is no <parsererror> element in the parsed document.
    await page.goto('about:blank');
    const wellFormed = await page.evaluate((xml) => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      return doc.querySelector('parsererror') === null;
    }, body);
    expect(wellFormed).toBe(true);
  });

  test('feed.json is JSON Feed 1.1 with required item fields', async ({ request }) => {
    const res = await request.get('/feed.json');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/(application\/feed\+json|application\/json)/);

    const json = (await res.json()) as {
      version: string;
      title: string;
      home_page_url: string;
      feed_url: string;
      items: Array<{ id: string; url: string; title: string; date_published: string }>;
    };

    expect(json.version).toBe('https://jsonfeed.org/version/1.1');
    expect(json.title).toBe('Hypertext Studio');
    expect(json.home_page_url).toBe('https://hypertext.studio');
    expect(json.feed_url).toBe('https://hypertext.studio/feed.json');
    expect(json.items.length).toBeGreaterThanOrEqual(2);

    const ids = json.items.map((i) => i.id);
    expect(ids).toContain(STUDY_URL);
    expect(ids).toContain(NOTE_URL);

    for (const item of json.items) {
      expect(item.id).toBeTruthy();
      expect(item.url).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.date_published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test('items sort newest first — note (T18:00Z) before study (T00:00Z) on same day', async ({
    request,
  }) => {
    const body = await (await request.get('/feed.xml')).text();
    const noteIdx = body.indexOf(NOTE_URL);
    const studyIdx = body.indexOf(STUDY_URL);
    expect(noteIdx).toBeGreaterThan(0);
    expect(studyIdx).toBeGreaterThan(0);
    expect(noteIdx).toBeLessThan(studyIdx);
  });
});
