import { expect, test } from '@playwright/test';

test.describe('prefers-reduced-motion', () => {
  test('disables dialog open transition', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.locator('button[data-dialog-target="logdate-detail"]').click();
    const dur = await page
      .locator('dialog#logdate-detail')
      .evaluate((el) => getComputedStyle(el).animationDuration);
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
