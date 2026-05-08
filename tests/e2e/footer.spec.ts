import { expect, test } from '@playwright/test';
import { FOOTER_PRINCIPLES } from '../fixtures/site';

test.describe('Footer (closing scene)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('does not exceed one viewport height at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const dims = await page.locator('footer.studio-footer').evaluate((el) => ({
      h: el.getBoundingClientRect().height,
      vh: window.innerHeight,
    }));
    expect(dims.h).toBeLessThanOrEqual(dims.vh + 1); // tolerate sub-pixel rounding
  });

  test('marquee announces the studio principles', async ({ page }) => {
    const m = page.locator('section.footer-marquee');
    await expect(m).toBeVisible();
    for (const principle of FOOTER_PRINCIPLES) {
      // Each principle is duplicated for the seamless loop; locator returns ≥1.
      await expect(m.getByText(principle).first()).toBeAttached();
    }
  });

  test('wordmark anchor is present', async ({ page }) => {
    await expect(page.locator('.footer-wordmark')).toBeVisible();
  });

  test('colophon-as-source markup contains real anchor tags', async ({ page }) => {
    const colophon = page.locator('section.colophon');
    await expect(colophon).toContainText('typefaces');
    await expect(colophon.getByRole('link', { name: /Source Serif 4/ })).toBeAttached();
    await expect(colophon.getByRole('link', { name: /Astro/ })).toBeAttached();
    await expect(
      colophon.getByRole('link', { name: /github\.com\/TheHypertextStudio\/website/ }),
    ).toBeAttached();
  });

  test('site map links every internal route', async ({ page }) => {
    const items = page
      .locator('section', { has: page.locator('h2', { hasText: 'Site map' }) })
      .getByRole('link');
    const labels = (await items.allTextContents()).map((s) => s.trim());
    expect(labels).toEqual(
      expect.arrayContaining(['Home', 'Studies', 'Contact', 'Privacy', 'Colophon', 'Source']),
    );
  });

  test('identity column contains rel=me links', async ({ page }) => {
    const ident = page.locator('section', { has: page.locator('h2', { hasText: 'Identity' }) });
    const relMeCount = await ident.locator('a[rel~="me"]').count();
    expect(relMeCount).toBeGreaterThanOrEqual(3);
  });

  test('status panel renders six operational rows', async ({ page }) => {
    const panel = page.locator('section.status-panel');
    for (const label of ['STUDIO TIME', 'LOCATION', 'EDGE', 'RENDER', 'BUILD', 'DEPLOYED']) {
      await expect(panel.locator('dt', { hasText: label })).toBeVisible();
    }
  });

  test('wordmark renders the <hypertext-studio/> motif', async ({ page }) => {
    const wm = page.locator('.footer-wordmark');
    await expect(wm).toContainText('hypertext-studio');
    await expect(wm).toContainText('<');
    await expect(wm).toContainText('/>');
  });

  test('studio time hydrates to a real clock format', async ({ page }) => {
    const time = page.locator('[data-status="time"]');
    await expect(time).toBeVisible();
    // Wait for the JS ticker to replace the placeholder.
    await expect.poll(async () => (await time.textContent())?.trim()).toMatch(/^\d{1,2}:\d{2}/);
  });

  test('poem text renders with the build-embedded fallback', async ({ page }) => {
    const poem = page.locator('figure.poem [data-poem-text]');
    await expect(poem).toContainText(/if this work is worth doing/i);
  });

  test('signature renders italic salutation + name', async ({ page }) => {
    await expect(page.locator('.signature')).toContainText('Faithfully');
    await expect(page.locator('.signature')).toContainText('Hypertext Studio');
  });

  test('small-print row has [view source], [print this page], [⌘K]', async ({ page }) => {
    const sp = page.locator('small.small-print');
    await expect(sp.getByRole('link', { name: /view source/ })).toBeAttached();
    await expect(sp.getByRole('button', { name: /print this page/i })).toBeAttached();
    await expect(sp.getByRole('button', { name: /open the command palette/i })).toBeAttached();
  });

  test('[view source] points to the GitHub repo at the page path', async ({ page }) => {
    const link = page.locator('small.small-print a', { hasText: 'view source' });
    const href = await link.getAttribute('href');
    expect(href).toMatch(/github\.com\/TheHypertextStudio\/website\/blob\/main\//);
  });

  test('clicking [⌘K] in small-print opens the palette', async ({ page }) => {
    await page.locator('small.small-print button[data-action="palette"]').click();
    await expect(page.locator('dialog#command-palette')).toBeVisible();
  });
});
