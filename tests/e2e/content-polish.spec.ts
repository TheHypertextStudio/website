import { expect, test } from '@playwright/test';

test('inline external links preserve separation from the following sentence', async ({ page }) => {
  await page.goto('/about');

  const firstParagraph = page.locator('.about-copy p').first();
  await expect(firstParagraph).toContainText('Willie Chalmers III started Hypertext Studio');
});
