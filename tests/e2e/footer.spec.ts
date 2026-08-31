import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('closes the site frame and exposes the launch essentials', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer.locator('.closing-tag')).toHaveText('</hypertext-studio>');
    for (const label of ['About', 'Support', 'Privacy']) {
      await expect(footer.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('presents product and studio destinations as a hypertext directory', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    const productDirectory = footer.getByRole('navigation', { name: 'Products' });
    const studioDirectory = footer.getByRole('navigation', { name: 'Studio' });

    for (const product of PRODUCTS) {
      const link = productDirectory.getByRole('link', { name: product.name, exact: true });
      await expect(link).toHaveAttribute('href', product.url);
      await expect(link.locator('.footer-link__address')).toHaveText(new URL(product.url).host);
    }

    for (const [label, href, address] of [
      ['About', '/about', '/about'],
      ['Support', '/contact', '/contact'],
      ['Privacy', '/privacy', '/privacy'],
      ['GitHub', 'https://github.com/TheHypertextStudio', 'github.com/TheHypertextStudio'],
    ] as const) {
      const link = studioDirectory.getByRole('link', { name: label, exact: true });
      await expect(link).toHaveAttribute('href', href);
      await expect(link.locator('.footer-link__address')).toHaveText(address);
    }
  });

  test('ends with useful destinations rather than a copyright notice', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByText(/©|copyright/i)).toHaveCount(0);
  });

  test('uses quiet hover and borderless reverse-video focus for directory links', async ({
    page,
  }) => {
    const footer = page.locator('.site-footer');
    const docket = page
      .getByRole('navigation', { name: 'Products' })
      .getByRole('link', { name: 'Docket', exact: true });

    const resting = await docket.evaluate((link) => ({
      background: getComputedStyle(link).backgroundColor,
      color: getComputedStyle(link).color,
    }));
    await docket.hover();
    const hovered = await docket.evaluate((link) => ({
      background: getComputedStyle(link).backgroundColor,
      color: getComputedStyle(link).color,
    }));
    await docket.focus();
    await expect(docket).toBeFocused();
    await expect.poll(() => docket.evaluate((link) => link.matches(':focus-visible'))).toBe(true);
    const focused = await docket.evaluate((link) => ({
      background: getComputedStyle(link).backgroundColor,
      color: getComputedStyle(link).color,
      outline: getComputedStyle(link).outlineStyle,
      shadow: getComputedStyle(link).boxShadow,
    }));
    const borders = await footer.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ];
    });

    expect(hovered.background).not.toBe(resting.background);
    expect(hovered.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(hovered.color).toBe(resting.color);
    expect(focused.background).not.toBe(hovered.background);
    expect(focused.color).not.toBe(resting.color);
    expect(focused.outline).toBe('none');
    expect(focused.shadow).toBe('none');
    expect(borders).toEqual(['0px', '0px', '0px', '0px']);
  });

  test('expands the closing scene as the footer enters the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const footer = page.locator('.site-footer');
    const supportsScrollTimeline = await page.evaluate(() =>
      CSS.supports('animation-timeline: view()'),
    );

    if (!supportsScrollTimeline) {
      await expect(footer.locator('.closing-tag')).toHaveCSS('animation-name', 'none');
      const fallbackSize = await footer
        .locator('.closing-tag')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
      expect(fallbackSize).toBeGreaterThanOrEqual(28);
      return;
    }

    await footer.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - window.innerHeight + 1);
    });
    await page.waitForTimeout(100);

    const entering = await footer.evaluate((element) => ({
      footerHeight: element.getBoundingClientRect().height,
      closingSize: parseFloat(
        getComputedStyle(element.querySelector<HTMLElement>('.closing-tag')!).fontSize,
      ),
    }));

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    const expanded = await footer.evaluate((element) => ({
      footerHeight: element.getBoundingClientRect().height,
      closingSize: parseFloat(
        getComputedStyle(element.querySelector<HTMLElement>('.closing-tag')!).fontSize,
      ),
    }));

    expect(Math.abs(expanded.footerHeight - entering.footerHeight)).toBeLessThanOrEqual(1);
    expect(expanded.closingSize - entering.closingSize).toBeGreaterThan(12);
  });

  test('shows the fully expanded footer without animation when motion is reduced', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/about');

    const layout = await page.locator('.site-footer').evaluate((footer) => {
      const closing = footer.querySelector<HTMLElement>('.closing-tag')!;
      return {
        footerHeight: footer.getBoundingClientRect().height,
        closingSize: parseFloat(getComputedStyle(closing).fontSize),
        animationName: getComputedStyle(closing).animationName,
      };
    });

    expect(layout.footerHeight).toBeGreaterThanOrEqual(200);
    expect(layout.closingSize).toBeGreaterThanOrEqual(28);
    expect(layout.animationName).toBe('none');
  });

  test('fits the expanded closing tag at the minimum mobile width', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/about');

    const fit = await page.locator('.site-footer').evaluate((footer) => {
      const inner = footer
        .querySelector<HTMLElement>('.site-footer__inner')!
        .getBoundingClientRect();
      const closing = footer.querySelector<HTMLElement>('.closing-tag')!.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        innerWidth: inner.width,
        closingWidth: closing.width,
      };
    });

    expect(fit.documentWidth).toBeLessThanOrEqual(fit.viewportWidth + 1);
    expect(fit.closingWidth).toBeLessThanOrEqual(fit.innerWidth);
  });
});
