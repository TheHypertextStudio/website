import { expect, test } from '@playwright/test';

test.describe('Self-anchoring headings', () => {
  test('Work section heading is addressable', async ({ page }) => {
    await page.goto('/');
    const h2 = page.locator('h2#work-heading');
    await expect(h2).toBeVisible();
    await expect(h2.locator('a.anchor[href="#work"]')).toBeAttached();
  });

  test('clicking a heading anchor updates the URL', async ({ page }) => {
    await page.goto('/');
    await page.locator('h2#work-heading a.anchor').click();
    await expect(page).toHaveURL(/#work$/);
  });

  test('clipboard receives the canonical URL on anchor click', async ({ browser }) => {
    // Spy on navigator.clipboard.writeText rather than calling readText, so
    // the test runs on every browser. readText is gated by per-browser
    // permission gymnastics in headless mode (chromium grants it on a flag,
    // firefox/webkit either don't ship it or require system prefs); the
    // permalink handler only ever calls writeText, so spying there is the
    // honest contract — we verify the write was attempted with the right URL.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const writes: string[] = [];
      (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites = writes;
      if (navigator.clipboard) {
        Object.defineProperty(navigator.clipboard, 'writeText', {
          configurable: true,
          value: async (text: string) => {
            writes.push(text);
          },
        });
      }
    });
    await page.goto('/');
    await page.locator('h2#work-heading a.anchor').click();
    const writes = await page.evaluate(
      () => (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites,
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/#work$/);
    await ctx.close();
  });

  test('privacy page sub-headings are anchored', async ({ page }) => {
    await page.goto('/privacy');
    const ids = ['collect', 'dont-collect', 'rights', 'email', 'webmentions', 'changes', 'contact'];
    for (const id of ids) {
      await expect(page.locator(`h2#${id}`)).toBeAttached();
    }
  });
});
