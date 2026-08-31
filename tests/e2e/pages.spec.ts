import { expect, test } from '@playwright/test';
import { PAGES } from '../fixtures/site';

const STUDY_PAGES = [
  { path: '/studies/curfew-the-locked-delay', title: 'The locked delay' },
  { path: '/studies/logdate-voice-without-transcription', title: 'Voice without transcription' },
  { path: '/studies/termsly-diffing-the-eula', title: 'Diffing the EULA' },
  {
    path: '/studies/three-products-one-privacy-stance',
    title: 'Three products, one privacy stance',
  },
] as const;

test.describe('Every page', () => {
  for (const p of PAGES) {
    test(`${p.path} renders 200 with expected title`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(p.titleIncludes));
    });

    test(`${p.path} has a single <h1> or <h1>-like heading`, async ({ page }) => {
      await page.goto(p.path);
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test(`${p.path} sets html[lang] and html[dir]`, async ({ page }) => {
      await page.goto(p.path);
      const lang = await page.locator('html').getAttribute('lang');
      const dir = await page.locator('html').getAttribute('dir');
      expect(lang).toBe('en');
      expect(dir).toBe('ltr');
    });

    test(`${p.path} renders the studio footer`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });

    test(`${p.path} has a skip link as the first focusable`, async ({ page }) => {
      // Test by DOM order rather than by pressing Tab. WebKit/Safari excludes
      // links from the default Tab cycle (a system preference); the skip link
      // is the first focusable element in the document either way. Default Tab
      // order tracks DOM order for elements without explicit positive
      // tabindex, so the contract is identical across browsers.
      await page.goto(p.path);
      const firstFocusable = page
        .locator(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        .first();
      await expect(firstFocusable).toHaveText(/skip to main/i);
    });

    test(`${p.path} renders the included view-source greeting comment`, async ({ page }) => {
      const res = await page.goto(p.path);
      const html = (await res?.text()) ?? '';
      expect(html).toContain('Welcome.');
      expect(html).toContain('github.com/TheHypertextStudio/website');
    });
  }

  test('unknown route renders the 404 page', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
    // The 404 body uses rel="home" to disambiguate from the footer site-map's
    // "Home" link.
    await expect(page.locator('main a[rel="home"]')).toBeVisible();
  });

  test('every page has a meta description', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.path);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc).toBeTruthy();
      expect(desc!.length).toBeGreaterThan(20);
    }
  });

  test('about page introduces the founder and his transit work', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('link', { name: 'Willie Chalmers III' })).toHaveAttribute(
      'href',
      'https://williecubed.me',
    );
    await expect(page.getByRole('link', { name: 'Las Vegans for Better Transit' })).toHaveAttribute(
      'href',
      'https://lasvegasfortransit.org',
    );
  });

  for (const study of STUDY_PAGES) {
    test(`${study.path} renders its study instead of the development error page`, async ({
      page,
    }) => {
      const response = await page.goto(study.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: study.title })).toBeVisible();
    });
  }
});
