import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

// The home page renders <ProductEntry> components — a research-index layout
// rather than marketing cards. Tests assert the entry structure: name, design
// question, screenshot with descriptive alt text, and an external canonical
// URL link for products that have shipped.
test.describe('Product entries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders one entry per product with its name as a sub-heading', async ({ page }) => {
    for (const p of PRODUCTS) {
      await expect(page.getByRole('heading', { level: 3, name: p.name })).toBeVisible();
    }
  });

  test('each entry has a screenshot with descriptive alt text', async ({ page }) => {
    for (const p of PRODUCTS) {
      const entry = page.locator(`article.entry#${p.slug}`);
      const alt = await entry.locator('img').first().getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(20);
    }
  });

  test('canonical URL link sits inside the product dialog with rel="external noopener"', async ({
    page,
  }) => {
    // The entry itself rejects a primary "Visit" CTA — the canonical link
    // lives in the dialog, where the studio recontextualizes the product.
    for (const p of PRODUCTS) {
      if (!p.url) continue;
      const link = page.locator(`dialog#${p.slug}-detail a[href="${p.url}"]`);
      await expect(link).toHaveAttribute('rel', /external/);
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('Product dialog', () => {
  for (const p of PRODUCTS) {
    test.describe(p.name, () => {
      test('opens via Details button and closes via Escape', async ({ page }) => {
        await page.goto('/');
        await page.locator(`button[data-dialog-target="${p.slug}-detail"]`).click();
        const dlg = page.locator(`dialog#${p.slug}-detail`);
        await expect(dlg).toBeVisible();
        await expect(dlg.getByRole('heading', { level: 2, name: p.name })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
      });

      test('closes via the explicit close button', async ({ page }) => {
        await page.goto('/');
        await page.locator(`button[data-dialog-target="${p.slug}-detail"]`).click();
        const dlg = page.locator(`dialog#${p.slug}-detail`);
        await expect(dlg).toBeVisible();
        await dlg.getByRole('button', { name: new RegExp(`close ${p.name} details`, 'i') }).click();
        await expect(dlg).toBeHidden();
      });

      test('closes when the dialog backdrop is clicked', async ({ page }) => {
        await page.goto('/');
        await page.locator(`button[data-dialog-target="${p.slug}-detail"]`).click();
        const dlg = page.locator(`dialog#${p.slug}-detail`);
        await expect(dlg).toBeVisible();
        // Click on the dialog element itself rather than its inner article.
        // The handler closes when e.target === dlg, which happens for clicks
        // on the strip between the inner content and the dialog edge or on
        // the backdrop. Dispatching the click directly on the dialog node
        // simulates that without needing to compute coordinates.
        await dlg.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        await expect(dlg).toBeHidden();
      });

      test('exposes stage and platforms in the metadata dl', async ({ page }) => {
        await page.goto('/');
        await page.locator(`button[data-dialog-target="${p.slug}-detail"]`).click();
        const dlg = page.locator(`dialog#${p.slug}-detail`);
        for (const field of ['Stage', 'Platforms']) {
          await expect(dlg.locator('dt', { hasText: field })).toBeVisible();
        }
      });

      test('links out to the product site for shipped products', async ({ page }) => {
        await page.goto('/');
        await page.locator(`button[data-dialog-target="${p.slug}-detail"]`).click();
        const dlg = page.locator(`dialog#${p.slug}-detail`);
        if (p.url) {
          // Shipped products (real URL) carry an outbound link in the foot
          // copy. The studio's design rejects a primary "Visit" CTA — the
          // link reads as a reference, with the domain as its text.
          const link = dlg.locator(`a[href="${p.url}"]`);
          await expect(link).toBeVisible();
          await expect(link).toHaveAttribute('rel', /external/);
        } else {
          // Unshipped products explain the absence of a public site.
          await expect(dlg.locator('a[rel~="external"]')).toHaveCount(0);
        }
      });
    });
  }

  test('dialogs are display:none when closed (no leakage into layout)', async ({ page }) => {
    await page.goto('/');
    for (const p of PRODUCTS) {
      const dlg = page.locator(`dialog#${p.slug}-detail`);
      await expect(dlg).toBeHidden();
      const display = await dlg.evaluate((el) => getComputedStyle(el).display);
      expect(display).toBe('none');
    }
  });
});
