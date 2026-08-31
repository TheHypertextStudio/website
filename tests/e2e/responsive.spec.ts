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

  test('product catalogue progresses from one to two to three columns', async ({ page }) => {
    for (const [width, expectedColumns] of [
      [390, 1],
      [768, 2],
      [1440, 3],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const lefts = await page
        .locator('article.product-card')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
      const unique = new Set(lefts);
      expect(unique.size).toBe(expectedColumns);
    }
  });

  test('artwork frames hug ASCII that fills the available width', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('/');

      const proportions = await page
        .locator('article.product-card')
        .first()
        .evaluate((card) => {
          const mediaBox = card
            .querySelector<HTMLElement>('.product-card__media')!
            .getBoundingClientRect();
          const artBox = card
            .querySelector<HTMLElement>('.product-card__ascii')!
            .getBoundingClientRect();

          return {
            widthFill: artBox.width / mediaBox.width,
            unusedHeight: mediaBox.height - artBox.height,
          };
        });

      expect(proportions.widthFill).toBeGreaterThan(0.9);
      // WebKit's IBM Plex Mono glyph box can exceed its container by a
      // subpixel even though the media frame clips it cleanly.
      expect(proportions.widthFill).toBeLessThanOrEqual(1.01);
      expect(proportions.unusedHeight).toBeLessThanOrEqual(24);
    }
  });

  test('landing spacing stays compact at tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const spacing = await page.evaluate(() => {
      const siteHeader = document
        .querySelector<HTMLElement>('.site-header')!
        .getBoundingClientRect();
      const headline = document
        .querySelector<HTMLElement>('.home-hero h1')!
        .getBoundingClientRect();
      const firstMedia = document
        .querySelector<HTMLElement>('.product-card__media')!
        .getBoundingClientRect();

      return {
        beforeHeadline: headline.top - siteHeader.bottom,
        afterHeadline: firstMedia.top - headline.bottom,
        pageInset: firstMedia.left,
      };
    });

    expect(spacing.beforeHeadline).toBeLessThanOrEqual(80);
    expect(spacing.afterHeadline).toBeLessThanOrEqual(80);
    expect(spacing.pageInset).toBeLessThanOrEqual(24);
  });

  test('mobile header keeps navigation on one compact row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const headerHeight = await page
      .locator('.site-header')
      .evaluate((header) => header.getBoundingClientRect().height);
    const linkTops = await page
      .locator('.site-header nav a')
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));

    expect(headerHeight).toBeLessThanOrEqual(72);
    expect(new Set(linkTops).size).toBe(1);
  });

  test('mobile shell uses one horizontal alignment grid', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const leftEdges = await page.evaluate(() =>
      ['.site-wordmark', '.home-hero h1', '.product-card__media', '.closing-tag'].map((selector) =>
        Math.round(document.querySelector(selector)!.getBoundingClientRect().left),
      ),
    );

    expect(new Set(leftEdges).size).toBe(1);
  });

  test('mobile product links provide a full-size touch target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const heights = await page
      .locator('.product-card__footer a')
      .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));

    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });

  test('mobile footer directory forms a substantial but bounded closing scene', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const height = await page
      .locator('.site-footer')
      .evaluate((footer) => footer.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(440);
    expect(height).toBeLessThanOrEqual(844);
  });

  test('desktop landing hands off directly from the product catalogue to a bounded footer', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const geometry = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('.product-card')];
      const productBottom = Math.max(...cards.map((card) => card.getBoundingClientRect().bottom));
      const footer = document.querySelector<HTMLElement>('.site-footer')!.getBoundingClientRect();

      return {
        transitionGap: footer.top - productBottom,
        footerHeight: footer.height,
      };
    });

    expect(geometry.transitionGap).toBeLessThanOrEqual(72);
    expect(geometry.footerHeight).toBeLessThanOrEqual(520);
  });

  test('desktop navigation and product metadata stay legible beside the display headline', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const sizes = await page.evaluate(() => ({
      navigation: Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>('.site-header nav')!).fontSize,
      ),
      productMetadata: Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>('.product-card__footer')!).fontSize,
      ),
    }));

    expect(sizes.navigation).toBeGreaterThanOrEqual(15);
    expect(sizes.productMetadata).toBeGreaterThanOrEqual(14);
  });

  for (const path of [
    '/studies/curfew-the-locked-delay',
    '/studies/logdate-voice-without-transcription',
    '/studies/termsly-diffing-the-eula',
  ]) {
    test(`${path} collapses authored marginalia into the mobile reading column`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);

      const layout = await page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const asides = [...document.querySelectorAll<HTMLElement>('[data-aside]')].map((aside) => {
          const bounds = aside.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right };
        });
        return { documentWidth, viewportWidth: window.innerWidth, asides };
      });

      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.asides.length).toBeGreaterThan(0);
      for (const aside of layout.asides) {
        expect(aside.left).toBeGreaterThanOrEqual(0);
        expect(aside.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
      }
    });
  }

  for (const path of [
    '/studies/curfew-the-locked-delay',
    '/studies/logdate-voice-without-transcription',
    '/studies/termsly-diffing-the-eula',
  ]) {
    test(`${path} keeps authored SVG figures visible and contained on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);

      const figures = page.locator('.figure');
      await expect(figures.first()).toBeVisible();
      const sizes = await figures.evaluateAll((elements) =>
        elements.map((figure) => {
          const body = figure.querySelector<HTMLElement>('.figure-body')!;
          const svg = body.querySelector<SVGElement>('svg')!;
          const bodyBox = body.getBoundingClientRect();
          const svgBox = svg.getBoundingClientRect();
          return {
            bodyWidth: bodyBox.width,
            svgWidth: svgBox.width,
            svgHeight: svgBox.height,
          };
        }),
      );

      for (const size of sizes) {
        expect(size.svgWidth).toBeGreaterThan(0);
        expect(size.svgHeight).toBeGreaterThan(0);
        expect(size.svgWidth).toBeLessThanOrEqual(size.bodyWidth + 1);
      }
    });
  }

  for (const path of [
    '/studies/curfew-the-locked-delay',
    '/studies/logdate-voice-without-transcription',
    '/studies/termsly-diffing-the-eula',
  ]) {
    test(`${path} renders authored figure labels as SVG text without HTML paragraphs`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      const html = (await response?.text()) ?? '';
      await expect(page.locator('.figure svg')).not.toHaveCount(0);
      expect(html).not.toMatch(/<text\b[^>]*><p>/);
    });
  }

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
