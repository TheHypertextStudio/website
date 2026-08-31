import { expect, test } from '@playwright/test';

test.describe('Primary navigation', () => {
  test('Products points to the product catalogue', async ({ page }) => {
    await page.goto('/about');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Products' })
      .click();
    await expect(page).toHaveURL(/\/#products$/);
  });

  test('About and Support use ordinary links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    await expect(nav.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/contact');
  });
});
