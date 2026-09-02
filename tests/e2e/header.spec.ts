import { expect, test, type Page } from '@playwright/test';

/**
 * Scroll-driven animations are unflagged in Chromium and WebKit but still
 * behind a pref in Firefox, so every assertion about the handoff is written
 * against whichever branch the engine actually takes. Same shape as the
 * footer's closing-tag test.
 */
async function supportsScrollTimeline(page: Page): Promise<boolean> {
  return page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
}

async function scrollTo(page: Page, y: number): Promise<void> {
  await page.evaluate((target) => window.scrollTo(0, target), y);
  // Scroll-driven animations settle on the compositor, a frame behind the
  // scroll itself. Reading computed style in the same task returns stale
  // values, so wait two frames before measuring.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

function wordmarkState(page: Page) {
  return page.locator('.site-wordmark').evaluate((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      opacity: Number.parseFloat(style.opacity),
      fontSize: Number.parseFloat(style.fontSize),
      top: box.top,
      left: Math.round(box.left),
    };
  });
}

test.describe('Sticky app bar', () => {
  test('pins the bar to the top of the viewport as the page scrolls', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header).toHaveCSS('position', 'sticky');

    await scrollTo(page, 600);
    const top = await header.evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeCloseTo(0, 0);
  });

  test('carries no rule under it in either scheme', async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const widths = await page.getByRole('banner').evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.borderBlockEndWidth, style.borderBlockStartWidth];
      });
      expect(widths).toEqual(['0px', '0px']);
    }
  });

  test('backs the bar with an opaque-enough panel once it overlaps content', async ({ page }) => {
    await page.goto('/');
    await scrollTo(page, 600);
    const panel = await page.getByRole('banner').evaluate((element) => {
      const style = getComputedStyle(element, '::before');
      return { opacity: Number.parseFloat(style.opacity), background: style.backgroundColor };
    });
    expect(panel.opacity).toBeGreaterThan(0.9);
    expect(panel.background).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('clears the sticky bar when a fragment link jumps to the catalogue', async ({ page }) => {
    await page.goto('/about');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Products' })
      .click();
    await expect(page).toHaveURL(/\/#products$/);

    const clearance = await page.evaluate(() => {
      const grid = document.querySelector('.products-grid')!.getBoundingClientRect();
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      return grid.top - header.bottom;
    });
    expect(clearance).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Hero-to-bar wordmark handoff', () => {
  test('hands the studio name from the hero to the bar as the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    if (!(await supportsScrollTimeline(page))) {
      // No handoff to run: the mark rests in the bar from the first paint,
      // and the hero keeps its name. Nothing is missing, only the motion.
      const resting = await wordmarkState(page);
      expect(resting.opacity).toBe(1);
      await expect(page.locator('.home-hero__mark')).toHaveCSS('opacity', '1');
      return;
    }

    const atTop = await wordmarkState(page);
    expect(atTop.opacity).toBe(0);
    expect(atTop.top).toBeGreaterThan(80);
    expect(atTop.fontSize).toBeGreaterThan(24);

    // Past the handoff the mark is parked, opaque, and at its resting size.
    await scrollTo(page, 400);
    const parked = await wordmarkState(page);
    expect(parked.opacity).toBe(1);
    expect(parked.top).toBeCloseTo(0, 0);
    expect(parked.fontSize).toBeCloseTo(15, 1);

    // And the hero's own name has gone, so the two forms never overlap.
    await expect(page.locator('.home-hero__mark')).toHaveCSS('opacity', '0');
  });

  test('never paints the travelling mark below the bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    test.skip(!(await supportsScrollTimeline(page)), 'no scroll-driven animations in this engine');

    for (const y of [40, 80, 110, 125, 138]) {
      await scrollTo(page, y);
      const { opacity, top } = await wordmarkState(page);
      const headerBottom = await page
        .getByRole('banner')
        .evaluate((element) => element.getBoundingClientRect().bottom);
      // Visible only once it has cleared the bar's bottom edge — a mark cut in
      // half by the clip, or floating over the hero, both read as a fault.
      if (opacity > 0.05) expect(top).toBeLessThan(headerBottom);
    }
  });

  test('rests the mark in the bar for readers who ask for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const resting = await wordmarkState(page);
    expect(resting.opacity).toBe(1);
    // In flow, not the animated absolute box, so it sits on the bar's padding
    // edge rather than at its top — inside the bar is the contract.
    const headerBottom = await page
      .getByRole('banner')
      .evaluate((element) => element.getBoundingClientRect().bottom);
    expect(resting.top).toBeGreaterThanOrEqual(0);
    expect(resting.top).toBeLessThan(headerBottom);
    await expect(page.locator('.home-hero__mark')).toHaveCSS('opacity', '1');
  });

  test('leaves pages without a hero showing the mark from the start', async ({ page }) => {
    await page.goto('/about');
    const resting = await wordmarkState(page);
    expect(resting.opacity).toBe(1);
    await expect(page.locator('.site-wordmark')).toBeVisible();
  });
});
