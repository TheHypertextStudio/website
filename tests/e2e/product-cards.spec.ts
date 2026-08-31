import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

test.describe('Launch products', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens with the locked company tagline and no supporting copy', async ({ page }) => {
    const hero = page.locator('.home-hero');
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(
      'Hypertext Studio builds software for humans.',
    );
    await expect(hero.locator('p')).toHaveCount(0);
  });

  test('renders exactly the three launch products', async ({ page }) => {
    const cards = page.locator('article.product-card');
    await expect(cards).toHaveCount(PRODUCTS.length);
    for (const p of PRODUCTS) {
      await expect(page.getByRole('heading', { level: 3, name: p.name })).toBeVisible();
      await expect(page.locator(`article.product-card#${p.slug}`)).toContainText(p.tagline);
    }
    await expect(page.getByText('Termsly', { exact: true })).toHaveCount(0);
  });

  test('each product uses literal, colored decorative ASCII instead of image assets', async ({
    page,
  }) => {
    const sceneBackgrounds: string[] = [];

    for (const p of PRODUCTS) {
      const card = page.locator(`article.product-card#${p.slug}`);
      const art = card.locator('pre.product-card__ascii');
      await expect(art).toHaveCount(1);
      await expect(art).toHaveAttribute('aria-hidden', 'true');

      const characters = await art.textContent();
      expect(characters).toBeTruthy();
      expect(characters!.length).toBeGreaterThan(80);
      expect(characters).toMatch(/^[\x20-\x7E\n]+$/);

      await expect(card.locator('img, picture, svg, canvas')).toHaveCount(0);
      await expect(card.locator('.product-card__media')).toHaveCSS('text-decoration-line', 'none');

      const colors = await art
        .locator('[data-tone]')
        .evaluateAll((characters) => [
          ...new Set(characters.map((character) => getComputedStyle(character).color)),
        ]);
      expect(colors.length).toBeGreaterThanOrEqual(3);

      sceneBackgrounds.push(
        await card
          .locator('.product-card__media')
          .evaluate((media) => getComputedStyle(media).backgroundColor),
      );
    }

    expect(new Set(sceneBackgrounds).size).toBe(PRODUCTS.length);
  });

  test('softens artwork through color while keeping glyph edges crisp', async ({ page }) => {
    const treatment = await page
      .locator('.product-card')
      .first()
      .evaluate((card) => {
        const art = card.querySelector<HTMLElement>('.product-card__ascii')!;
        const media = card.querySelector<HTMLElement>('.product-card__media')!;
        const strongestTone = art.querySelector<HTMLElement>('[data-tone="4"]')!;

        const parseColor = (color: string) => {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const context = canvas.getContext('2d')!;
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
        };
        const distance = (a: number[], b: number[]) =>
          Math.hypot(...a.map((channel, index) => channel - b[index]));

        const cardStyle = getComputedStyle(card);
        const background = parseColor(getComputedStyle(media).backgroundColor);
        const source = parseColor(cardStyle.getPropertyValue('--ascii-4'));
        const rendered = parseColor(getComputedStyle(strongestTone).color);

        return {
          filter: getComputedStyle(art).filter,
          sourceDistance: distance(source, background),
          renderedDistance: distance(rendered, background),
        };
      });

    expect(treatment.filter).toBe('none');
    expect(treatment.renderedDistance).toBeLessThan(treatment.sourceDistance);
  });

  test('keeps decorative artwork out of selection and accessible naming', async ({ page }) => {
    for (const p of PRODUCTS) {
      const card = page.locator(`article.product-card#${p.slug}`);
      const art = card.locator('.product-card__ascii');
      const media = card.locator('.product-card__media');

      await expect(art).toHaveAttribute('aria-hidden', 'true');
      const effectiveUserSelect = await art.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.userSelect || style.webkitUserSelect;
      });
      expect(effectiveUserSelect).toBe('none');
      await expect(art).toHaveCSS('pointer-events', 'none');
      await expect(media).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('each product links directly to its public site', async ({ page }) => {
    for (const p of PRODUCTS) {
      const link = page.locator(
        `article.product-card#${p.slug} .product-card__footer a[href="${p.url}"]`,
      );
      await expect(link).toBeVisible();
      await expect(link).toContainText(`Visit ${p.name}`);
      await expect(link).toHaveAttribute('rel', /external/);
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('uses paired hypertext tags as the site frame', async ({ page }) => {
    const wordmark = page.locator('.site-wordmark');
    await expect(wordmark.locator('[aria-hidden="true"]')).toHaveText('<hypertext-studio>');
    await expect(wordmark).toHaveAttribute('translate', 'no');
    await expect(page.locator('.closing-tag')).toHaveText('</hypertext-studio>');
    await expect(page.locator('.closing-tag')).toHaveAttribute('translate', 'no');
  });
});
