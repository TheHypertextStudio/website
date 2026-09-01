import { expect, test } from '@playwright/test';

const canonicalOrigin = 'https://hypertext.studio';

test('serves the built public pages with their intended identity', async ({ request }) => {
  const pages = [
    { marker: 'Hypertext Studio builds software for humans.', path: '/' },
    { marker: 'Willie Chalmers III', path: '/about/' },
    { marker: 'Privacy', path: '/privacy/' },
    { marker: 'Contact', path: '/contact/' },
  ];

  for (const page of pages) {
    const response = await request.get(page.path);
    expect(response.status(), page.path).toBe(200);
    expect(response.headers()['content-type'], page.path).toContain('text/html');
    expect(await response.text(), page.path).toContain(page.marker);
  }
});

test('serves every same-origin asset referenced by the built homepage', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const assetUrls = await page
    .locator(
      'link[rel="stylesheet"][href], link[rel="icon"][href], link[rel="preload"][href], link[rel="modulepreload"][href], script[src], img[src]',
    )
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
        .filter((value): value is string => Boolean(value))
        .map((value) => new URL(value, window.location.href))
        .filter((url) => url.origin === window.location.origin)
        .map((url) => `${url.pathname}${url.search}`),
    );

  expect(assetUrls.length).toBeGreaterThan(0);
  for (const url of [...new Set(assetUrls)]) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
  }
});

test('publishes canonical discovery and well-known metadata', async ({ request }) => {
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(`${canonicalOrigin}/sitemap-0.xml`);

  const sitemapPages = await request.get('/sitemap-0.xml');
  expect(sitemapPages.status()).toBe(200);
  const sitemapBody = await sitemapPages.text();
  expect(sitemapBody).toContain(`<loc>${canonicalOrigin}/</loc>`);
  expect(sitemapBody).toContain(`<loc>${canonicalOrigin}/about/</loc>`);

  const security = await request.get('/.well-known/security.txt');
  expect(security.status()).toBe(200);
  expect(await security.text()).toContain('Contact:');

  const assetLinks = await request.get('/.well-known/assetlinks.json');
  expect(assetLinks.status()).toBe(200);
  expect(Array.isArray(await assetLinks.json())).toBe(true);

  const webfinger = await request.get('/.well-known/webfinger');
  expect(webfinger.status()).toBe(200);
  expect((await webfinger.json()).subject).toBe('acct:hypertext.studio@hypertext.studio');

  const hostMeta = await request.get('/.well-known/host-meta');
  expect(hostMeta.status()).toBe(200);
  expect(await hostMeta.text()).toContain('rel="lrdd"');
});

test('preserves the not-found contract in the built artifact', async ({ request }) => {
  const response = await request.get('/this-route-must-not-exist');
  expect(response.status()).toBe(404);
});
