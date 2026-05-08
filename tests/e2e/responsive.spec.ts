import { expect, test } from '@playwright/test';
import { PAGES } from '../fixtures/site';

const VIEWPORTS = [
  { name: 'mobile-min', width: 320, height: 568 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
];

test.describe('Responsive layout', () => {
  for (const vp of VIEWPORTS) {
    for (const p of PAGES) {
      test(`${p.path} @ ${vp.name} has no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(p.path);
        const overflow = await page.evaluate(() => ({
          docW: document.documentElement.scrollWidth,
          winW: window.innerWidth,
        }));
        // 1px tolerance for sub-pixel rounding.
        expect(overflow.docW).toBeLessThanOrEqual(overflow.winW + 1);
      });
    }
  }

  test('400% zoom equivalent (320×768) reflows landing without horizontal scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 768 });
    await page.goto('/');
    const o = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
    }));
    expect(o.docW).toBeLessThanOrEqual(o.winW + 1);
  });

  test('product entries stack as a single column at every breakpoint', async ({ page }) => {
    // Per ProductEntry's design (research-index, not a marketing card), the
    // work section reads top-to-bottom as one entry per row at every width.
    // No 3-up card grid. Verify by measuring entries' horizontal positions.
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const lefts = await page
        .locator('article.entry')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
      // Every entry shares the same left edge — they stack, not grid.
      const unique = new Set(lefts);
      expect(unique.size).toBe(1);
    }
  });

  test('touch targets meet a humane minimum at mobile size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // Only check controls explicitly marked as primary CTAs (data-cta) — the
    // studio's design intentionally rejects card-style primary buttons, so
    // the home page may have none. Tertiary controls in the small-print
    // band are deliberately small per "calm before clever" (mission §8).
    const ctas = page.locator('[data-cta]:visible');
    const count = await ctas.count();
    for (let i = 0; i < count; i++) {
      const box = await ctas.nth(i).boundingBox();
      if (!box) continue;
      expect.soft(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(20);
    }
  });
});
