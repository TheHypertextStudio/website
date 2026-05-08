import { expect, test } from '@playwright/test';

test.describe('Status bar', () => {
  test('exists as an aria-live polite landmark', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('#status-bar');
    await expect(bar).toBeAttached();
    await expect(bar).toHaveAttribute('aria-live', 'polite');
  });

  test('hovering a link populates the URL slot', async ({ page }) => {
    await page.goto('/');
    // Pick the first VISIBLE external link. The studio's design rejects a
    // primary "Visit" CTA — links read as references — so we look for any
    // external https link that isn't inside the hidden h-card.
    const link = page.locator('a[rel~="external"][href^="https://"]:visible').first();
    await link.hover();
    const text = await page.locator('#status-bar [data-url]').textContent();
    expect(text).toContain('https://');
  });

  test('mouseout clears the URL slot', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[rel~="external"][href^="https://"]:visible').first();
    await link.hover();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(80);
    const text = await page.locator('#status-bar [data-url]').textContent();
    expect((text ?? '').trim()).toBe('');
  });

  test('hold-modifier swaps the bar to shortcut hint', async ({ page }) => {
    await page.goto('/');
    const isMac = process.platform === 'darwin';
    await page.keyboard.down(isMac ? 'Meta' : 'Control');
    await expect(page.locator('html')).toHaveAttribute('data-modifier', 'on');
    await expect(page.locator('#status-bar [data-hint]')).toBeVisible();
    await page.keyboard.up(isMac ? 'Meta' : 'Control');
    await expect(page.locator('#status-bar [data-hint]')).toBeHidden();
  });
});
