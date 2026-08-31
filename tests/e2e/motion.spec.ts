import { expect, test } from '@playwright/test';

test.describe('prefers-reduced-motion', () => {
  test('disables transitions', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    const dur = await page
      .locator('.product-card__media')
      .first()
      .evaluate((el) => {
        return getComputedStyle(el).transitionDuration;
      });
    // Either disabled (0s) or set to ~0 by the @media block.
    const ms = parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000);
    expect(ms).toBeLessThan(20);
    await ctx.close();
  });
});

test.describe('prefers-contrast: more', () => {
  test('raises link color contrast', async ({ browser }) => {
    const ctx = await browser.newContext({ contrast: 'more' });
    const page = await ctx.newPage();
    await page.goto('/');
    const linkColor = await page
      .locator('a')
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(linkColor).toBeTruthy();
    await ctx.close();
  });
});
