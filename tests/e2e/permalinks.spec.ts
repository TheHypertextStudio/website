import { expect, test } from '@playwright/test';

test.describe('Self-anchoring headings', () => {
  test('Products section is addressable', async ({ page }) => {
    await page.goto('/#products');
    await expect(page.locator('section#products')).toBeVisible();
  });

  test('privacy page sub-headings are anchored', async ({ page }) => {
    await page.goto('/privacy');
    const ids = [
      'scope',
      'collect',
      'processing',
      'recipients',
      'webmentions',
      'retention',
      'security',
      'rights',
      'children',
      'international',
      'contact',
    ];
    for (const id of ids) {
      await expect(page.locator(`h2#${id}`)).toBeAttached();
    }
  });
});
