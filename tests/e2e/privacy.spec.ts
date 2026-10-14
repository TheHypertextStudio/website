import { expect, test } from '@playwright/test';

for (const signals of [
  { name: 'DNT', dnt: '1', gpc: false, allowed: false },
  { name: 'GPC', dnt: '0', gpc: true, allowed: false },
  { name: 'both off', dnt: '0', gpc: false, allowed: true },
]) {
  test(`analytics network requests respect ${signals.name}`, async ({ page }) => {
    const requests: string[] = [];
    await page.addInitScript(({ dnt, gpc }) => {
      Object.defineProperty(navigator, 'doNotTrack', { get: () => dnt });
      Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => gpc });
    }, signals);
    await page.route('https://static.cloudflareinsights.com/**', async (route) => {
      requests.push(route.request().url());
      // Exercise the network boundary without sending test visits to a provider.
      await route.fulfill({ contentType: 'application/javascript', body: '' });
    });
    // Supply a token only in the intercepted test response, then exercise the
    // page's actual loader. No token is added to build or provider configuration.
    await page.route('**/privacy/', async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '</head>',
        '<meta name="hypertext-analytics-token" content="browser-test-only"></head>',
      );
      await route.fulfill({ response, body: html });
    });
    await page.goto('/privacy/');
    if (signals.allowed) {
      await expect.poll(() => requests.length).toBe(1);
      await expect(page.locator('script[data-cf-beacon]')).toHaveCount(1);
    } else {
      await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
      expect(requests).toEqual([]);
    }
  });
}

test('unconfigured analytics makes no beacon request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/cloudflareinsights|\/cdn-cgi\/rum/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/privacy/');
  await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('privacy contact and exact previous notice remain reachable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/privacy/');
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-14');
  await expect(page.locator('main a[href="mailto:legal@hypertext.studio"]').first()).toBeVisible();
  await expect(page.locator('main a[href="mailto:contact@hypertext.studio"]')).toBeVisible();
  await expect(page.locator('main a[href="mailto:support@hypertext.studio"]')).toBeVisible();
  await page.getByRole('link', { name: 'Read previous policies' }).click();
  await page.getByRole('link', { name: 'Privacy notice before October 14, 2026' }).click();
  await expect(
    page.getByText('That is everything we collect from your visit.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Read the current notice' }).click();
  await expect(page.locator('main')).toContainText('1810 East Sahara Avenue STE 75246');
  await page.goto('/contact/');
  for (const role of ['contact', 'support', 'legal']) {
    await expect(page.locator(`main a[href="mailto:${role}@hypertext.studio"]`)).toBeVisible();
  }
  await context.close();
});
