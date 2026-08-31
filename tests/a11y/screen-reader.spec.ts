import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

test.describe('@a11y Screen-reader structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('gives the product catalogue a heading and nests product headings beneath it', async ({
    page,
  }) => {
    const catalogue = page.getByRole('region', { name: 'Products' });

    await expect(catalogue.getByRole('heading', { level: 2, name: 'Products' })).toHaveCount(1);
    for (const product of PRODUCTS) {
      await expect(catalogue.getByRole('heading', { level: 3, name: product.name })).toHaveCount(1);
    }
  });

  test('keeps decorative product art out of the link and focus order', async ({ page }) => {
    for (const product of PRODUCTS) {
      const card = page.locator(`article.product-card#${product.slug}`);
      await expect(card.locator('.product-card__media')).not.toHaveRole('link');
      await expect(card.locator(`a[href="${product.url}"]`)).toHaveCount(1);
    }
  });

  test('announces the tagged wordmark as the studio home link', async ({ page }) => {
    const wordmark = page.locator('.site-wordmark');
    await expect(wordmark).toHaveAccessibleName('Hypertext Studio home');
    await expect(wordmark).not.toHaveAttribute('aria-label');
    await expect(wordmark.locator('[aria-hidden="true"]')).toHaveText('<hypertext-studio>');
    await expect(wordmark.locator('.sr-only')).toHaveText('Hypertext Studio home');
  });

  test('announces external links without the decorative arrow', async ({ page }) => {
    for (const product of PRODUCTS) {
      await expect(
        page.locator(`article.product-card#${product.slug} .product-card__footer a`),
      ).toHaveAccessibleName(`Visit ${product.name}`);
    }
  });

  test('announces footer directory headings without the decorative slash', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(
      footer.getByRole('heading', { level: 2, name: 'Products', exact: true }),
    ).toHaveCount(1);
    await expect(
      footer.getByRole('heading', { level: 2, name: 'Studio', exact: true }),
    ).toHaveCount(1);
  });
});
