import { expect, test } from '@playwright/test';

test.describe('@a11y Forced colors', () => {
  test('home page renders with forced-colors active', async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: 'active' });
    const page = await ctx.newPage();
    await page.goto('/');
    // Confirm core landmarks remain present and visible under high-contrast.
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await ctx.close();
  });

  test('product entry figures keep visible borders in forced-colors mode', async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: 'active' });
    const page = await ctx.newPage();
    await page.goto('/');
    const border = await page
      .locator('.entry__figure')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    // Either the rule survives or forced-colors substitutes a CanvasText
    // border. Either way, a visible edge frames the screenshot on paper-
    // and high-contrast renderings.
    expect(parseFloat(border)).toBeGreaterThanOrEqual(0.5);
    await ctx.close();
  });
});
