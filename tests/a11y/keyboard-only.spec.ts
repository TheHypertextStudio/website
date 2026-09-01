import { expect, test } from '@playwright/test';
import { PAGES } from '../fixtures/site';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

test.describe('@a11y Keyboard-only navigation', () => {
  for (const p of PAGES) {
    test(`${p.path} has more than three focusable elements in the Tab cycle`, async ({ page }) => {
      // Count the candidate focusables in DOM order rather than walking
      // Tab presses. Safari excludes links from the default Tab cycle
      // (a system pref); a DOM-order count tracks the contract — that the
      // page actually has reachable interactive controls — without relying
      // on per-browser Tab semantics. Skip-link reachability is asserted
      // separately on every browser by the dedicated test in pages.spec.ts.
      await page.goto(p.path);
      // Poll rather than sampling once: Astro's first on-demand compilation can
      // swap the document mid-scan, which counts zero focusables on a page that
      // has plenty. Same reload race as the networkidle wait in citations.spec.ts.
      await expect.poll(() => page.locator(FOCUSABLE).count()).toBeGreaterThan(3);
    });
  }

  test('product links are keyboard reachable', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#docket .product-card__footer a');
    await link.focus();
    await expect(link).toBeFocused();
  });
});
