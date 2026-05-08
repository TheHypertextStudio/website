import { expect, test } from '@playwright/test';

test.describe('Microformats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('h-card is present with the studio profile', async ({ page }) => {
    const card = page.locator('article.h-card');
    await expect(card).toHaveCount(1);
  });

  test('h-card has u-url + u-uid + p-name', async ({ page }) => {
    const card = page.locator('article.h-card');
    const inner = card.locator('a.u-url.u-uid.p-name');
    await expect(inner).toHaveAttribute('href', 'https://hypertext.studio');
    await expect(inner).toHaveText('Hypertext Studio');
  });

  test('h-card has u-email + u-photo', async ({ page }) => {
    const card = page.locator('article.h-card');
    await expect(card.locator('a.u-email')).toHaveAttribute(
      'href',
      /mailto:hello@hypertext\.studio/,
    );
    await expect(card.locator('img.u-photo')).toBeAttached();
  });

  test('h-card has p-locality + p-region', async ({ page }) => {
    const card = page.locator('article.h-card');
    await expect(card.locator('.p-locality')).toContainText('Las Vegas');
    await expect(card.locator('.p-region')).toContainText('NV');
  });

  test('rel=me reciprocity links exist for GitHub, Bluesky, Fediverse', async ({ page }) => {
    const card = page.locator('article.h-card');
    const targets = [
      'github.com/TheHypertextStudio',
      'bsky.app/profile/hypertext.studio',
      'fed.brid.gy',
    ];
    for (const t of targets) {
      await expect(card.locator(`a[rel="me"][href*="${t}"]`).first()).toBeAttached();
    }
  });
});

test.describe('h-entry on study pages (IndieWeb tier 3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studies/curfew-launch');
  });

  test('article carries the h-entry root class', async ({ page }) => {
    await expect(page.locator('article.h-entry')).toHaveCount(1);
  });

  test('h-entry has p-name on the title', async ({ page }) => {
    const name = page.locator('article.h-entry .p-name').first();
    await expect(name).toContainText('Curfew');
  });

  test('h-entry has e-content wrapping the body', async ({ page }) => {
    await expect(page.locator('article.h-entry .e-content')).toHaveCount(1);
  });

  test('h-entry has dt-published with a parseable datetime', async ({ page }) => {
    const time = page.locator('article.h-entry time.dt-published').first();
    const datetime = await time.getAttribute('datetime');
    expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  test('h-entry has p-author linked to the studio h-card', async ({ page }) => {
    const author = page.locator('article.h-entry .p-author').first();
    await expect(author).toBeAttached();
    // The author block links to the studio root, which carries the h-card.
    await expect(author.locator('a[rel="author"]')).toHaveAttribute(
      'href',
      'https://hypertext.studio',
    );
  });

  test('p-category is applied to tag chips', async ({ page }) => {
    const cats = page.locator('article.h-entry .p-category');
    await expect(cats.first()).toBeAttached();
  });
});

test.describe('h-entry on note pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes/2026-04-08-on-finishing');
  });

  test('note article carries h-entry', async ({ page }) => {
    await expect(page.locator('article.h-entry')).toHaveCount(1);
  });

  test('note has e-content + dt-published + p-author', async ({ page }) => {
    await expect(page.locator('article.h-entry .e-content')).toHaveCount(1);
    await expect(page.locator('article.h-entry time.dt-published')).toHaveCount(1);
    await expect(page.locator('article.h-entry .p-author')).toHaveCount(1);
  });
});
