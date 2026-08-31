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

  test('product media keeps a visible border in forced-colors mode', async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: 'active' });
    const page = await ctx.newPage();
    await page.goto('/');
    // The locator assertion re-resolves after a dev-server HMR refresh,
    // unlike a one-shot evaluate call whose execution context can disappear.
    await expect(page.locator('.product-card__media').first()).toHaveCSS('border-top-width', '1px');
    await ctx.close();
  });
});
