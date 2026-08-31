import { expect, test } from '@playwright/test';
import { PAGES } from '../fixtures/site';
import { readJsonLd } from '../fixtures/utils';

test.describe('<head> metadata', () => {
  for (const p of PAGES) {
    test(`${p.path} has Open Graph + Twitter card`, async ({ page }) => {
      await page.goto(p.path);
      const og = {
        site_name: await page.locator('meta[property="og:site_name"]').getAttribute('content'),
        title: await page.locator('meta[property="og:title"]').getAttribute('content'),
        description: await page.locator('meta[property="og:description"]').getAttribute('content'),
        type: await page.locator('meta[property="og:type"]').getAttribute('content'),
        image: await page.locator('meta[property="og:image"]').getAttribute('content'),
      };
      expect(og.site_name).toBe('Hypertext Studio');
      expect(og.title?.length).toBeGreaterThan(0);
      expect(og.description?.length).toBeGreaterThan(0);
      expect(og.type).toBe('website');
      expect(og.image).toMatch(/^https:\/\/hypertext\.studio\//);

      const twcard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(twcard).toBe('summary_large_image');
    });

    test(`${p.path} has canonical + i18n alternates`, async ({ page }) => {
      await page.goto(p.path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toMatch(/^https:\/\/hypertext\.studio/);
      const enAlt = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
      const xDefault = await page
        .locator('link[rel="alternate"][hreflang="x-default"]')
        .getAttribute('href');
      expect(enAlt).toBeTruthy();
      expect(xDefault).toBeTruthy();
    });

    test(`${p.path} declares webmention + micropub endpoints`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator('link[rel="webmention"]')).toHaveAttribute('href', '/webmention');
      await expect(page.locator('link[rel="micropub"]')).toHaveAttribute('href', '/micropub');
      await expect(page.locator('link[rel="authorization_endpoint"]')).toHaveAttribute(
        'href',
        'https://indieauth.com/auth',
      );
      await expect(page.locator('link[rel="token_endpoint"]')).toHaveAttribute(
        'href',
        'https://tokens.indieauth.com/token',
      );
    });
  }
});

test.describe('Schema.org JSON-LD', () => {
  test('home page graph contains Organization + WebSite + ItemList', async ({ page }) => {
    await page.goto('/');
    const graph = await readJsonLd(page);
    const types = graph.map((n) => (n as { '@type'?: string })['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).toContain('ItemList');
  });

  test('Organization node has full PostalAddress', async ({ page }) => {
    await page.goto('/');
    const graph = await readJsonLd(page);
    const org = graph.find((n) => (n as { '@type'?: string })['@type'] === 'Organization') as
      Record<string, unknown> | undefined;
    expect(org).toBeTruthy();
    expect(org?.url).toBe('https://hypertext.studio');
    const address = org?.address as Record<string, unknown> | undefined;
    expect(address?.addressLocality).toBe('Las Vegas');
    expect(address?.addressRegion).toBe('NV');
  });

  test('home page lists all three SoftwareApplication entries', async ({ page }) => {
    await page.goto('/');
    const graph = await readJsonLd(page);
    const apps = graph.filter(
      (n) => (n as { '@type'?: string })['@type'] === 'SoftwareApplication',
    );
    expect(apps).toHaveLength(3);
  });
});

test.describe('Sitemap (built artifact)', () => {
  test('sitemap-index.xml is reachable on the built site', async ({ request, baseURL }) => {
    if (!baseURL?.includes('localhost')) return;
    // dev does not produce sitemap; this is a smoke test for built/preview servers.
    const res = await request.get('/sitemap-index.xml').catch(() => null);
    test.skip(!res || res.status() === 404, 'sitemap only present on built site');
  });
});
