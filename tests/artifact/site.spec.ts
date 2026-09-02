import { expect, test } from '@playwright/test';

import { STATIC_FILES } from '../fixtures/site';

const canonicalOrigin = 'https://hypertext.studio';

test('serves the built public pages with their intended identity', async ({ request }) => {
  const pages = [
    { marker: 'Hypertext Studio builds software for humans.', path: '/' },
    { marker: 'Willie Chalmers III', path: '/about/' },
    // Every page carries "Privacy" and "Contact" in the footer site-map, so
    // each marker has to be body copy that only its own page contains.
    { marker: 'What we collect when you visit hypertext.studio.', path: '/privacy/' },
    { marker: 'Press, partnership, and product feedback go to the same inbox.', path: '/contact/' },
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

// Adding a file to the fixture extends this suite automatically. The content
// types come from dist/_headers, which only the Pages runtime applies.
test('serves every static file the site declares, with its declared type', async ({ request }) => {
  for (const file of STATIC_FILES) {
    const response = await request.get(file.path);
    expect(response.status(), file.path).toBe(200);
    expect(response.headers()['content-type'], file.path).toMatch(file.contentType);
  }
});

test('applies the _headers security policy to every response', async ({ request }) => {
  for (const path of ['/', '/about/', '/llms.txt']) {
    const headers = (await request.get(path)).headers();
    expect(headers['content-security-policy'], path).toContain("default-src 'self'");
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    expect(headers['strict-transport-security'], path).toContain('max-age=63072000');
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
  }
});

test('long-caches immutable build assets and fonts', async ({ page, request }) => {
  await page.goto('/');
  const asset = await page
    .locator('script[src^="/_astro/"], link[rel="stylesheet"][href^="/_astro/"]')
    .first()
    .evaluate((element) => element.getAttribute('src') ?? element.getAttribute('href'));

  for (const path of [asset, '/fonts/InterVariable.woff2']) {
    const cacheControl = (await request.get(path!)).headers()['cache-control'];
    expect(cacheControl, path!).toContain('immutable');
    expect(cacheControl, path!).toContain('max-age=31536000');
  }
});

test('redirects bare page paths to their canonical trailing slash', async ({ request }) => {
  const response = await request.get('/about', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()['location']).toBe('/about/');
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

// Google Play Services fetches this file directly from the phone before it
// lets the Docket Android app use a hypertext.studio passkey. On 2026-09-01 it
// rejected the association while the file still sent Cross-Origin-Resource-Policy
// and declared only the login-credential relation. These are the served bytes
// and headers it accepted afterwards.
test('serves the Docket asset links the way Play Services fetches them', async ({ request }) => {
  const response = await request.get('/.well-known/assetlinks.json', {
    headers: {
      'User-Agent':
        'com.google.android.gms/263360035 (Linux; U; Android 17; en_US; Pixel 8 Pro; Build/CP41.260814.003.B1; Cronet/151.0.7922.83)',
    },
  });
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers['content-type']).toMatch(/^application\/json/);
  expect(headers['access-control-allow-origin']).toBe('*');
  expect(headers['cross-origin-resource-policy']).toBeUndefined();
  expect(headers['cache-control']).toContain('max-age=3600');

  const statements = (await response.json()) as Array<{
    relation: string[];
    target: { namespace: string; package_name?: string; sha256_cert_fingerprints?: string[] };
  }>;
  const docket = statements.find(
    (statement) =>
      statement.target.namespace === 'android_app' &&
      statement.target.package_name === 'studio.hypertext.docket',
  );
  expect(docket, 'a statement for studio.hypertext.docket').toBeDefined();
  expect(docket!.relation).toEqual(
    expect.arrayContaining([
      'delegate_permission/common.get_login_creds',
      'delegate_permission/common.handle_all_urls',
    ]),
  );
  expect(docket!.target.sha256_cert_fingerprints).toContain(
    'DF:32:69:D4:DC:C9:C4:FE:72:FE:61:62:A0:F4:E9:EE:5F:04:14:47:DC:B3:8E:F6:A9:25:76:FC:38:90:DB:C7',
  );
});

test('preserves the not-found contract in the built artifact', async ({ request }) => {
  const response = await request.get('/this-route-must-not-exist');
  expect(response.status()).toBe(404);
});
