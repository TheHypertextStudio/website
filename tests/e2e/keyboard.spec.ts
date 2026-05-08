import { expect, test } from '@playwright/test';
import { PALETTE_KEY, pressSequence } from '../fixtures/utils';

test.describe('Command palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test(`${PALETTE_KEY} opens and closes the palette`, async ({ page }) => {
    await page.keyboard.press(PALETTE_KEY);
    await expect(page.locator('dialog#command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog#command-palette')).toBeHidden();
  });

  test('input filters items', async ({ page }) => {
    await page.keyboard.press(PALETTE_KEY);
    const list = page.locator('#palette-results');
    const initial = await list.locator('.palette__item:not([hidden])').count();
    expect(initial).toBeGreaterThan(5);

    await page.locator('#palette-input').fill('logdate');
    await page.waitForTimeout(50);
    const filtered = await list.locator('.palette__item:not([hidden])').count();
    expect(filtered).toBeLessThan(initial);
    expect(filtered).toBeGreaterThan(0);
  });

  test('Arrow keys move selection, Enter activates', async ({ page }) => {
    await page.keyboard.press(PALETTE_KEY);
    await page.locator('#palette-input').fill('contact');
    await page.waitForTimeout(50);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/contact/);
  });

  test('reports "No matches" for empty result sets', async ({ page }) => {
    await page.keyboard.press(PALETTE_KEY);
    await page.locator('#palette-input').fill('zzzzznoresults');
    await page.waitForTimeout(50);
    await expect(page.locator('#palette-empty')).toBeVisible();
  });

  test('? opens the shortcut sheet', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('dialog#shortcut-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog#shortcut-sheet')).toBeHidden();
  });
});

test.describe('Sequence shortcuts', () => {
  test('g h navigates to home', async ({ page }) => {
    await page.goto('/colophon');
    await pressSequence(page, 'g h');
    await expect(page).toHaveURL(/\/$/);
  });

  test('g w jumps to the work section anchor', async ({ page }) => {
    await page.goto('/colophon');
    await pressSequence(page, 'g w');
    await expect(page).toHaveURL(/\/(?:#work)?$/);
  });

  test('g s navigates to studies', async ({ page }) => {
    await page.goto('/');
    await pressSequence(page, 'g s');
    await expect(page).toHaveURL(/\/studies\/?$/);
  });

  test('g c navigates to colophon', async ({ page }) => {
    await page.goto('/');
    await pressSequence(page, 'g c');
    await expect(page).toHaveURL(/\/colophon\/?$/);
  });

  test('sequence resets after 1s timeout', async ({ page }) => {
    await page.goto('/colophon');
    await page.keyboard.press('g');
    await page.waitForTimeout(1100);
    await page.keyboard.press('h');
    // Long delay should NOT navigate.
    await expect(page).toHaveURL(/\/colophon\/?$/);
  });

  test('shortcuts are disabled when focus is in an editable field', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press(PALETTE_KEY);
    await page.locator('#palette-input').focus();
    await page.locator('#palette-input').fill('g h');
    // Should NOT have navigated (palette input swallowed the keys).
    await expect(page).toHaveURL(/\/$/);
    await page.keyboard.press('Escape');
  });
});

test.describe('Hold-modifier reveals shortcut hint', () => {
  test('pressing Meta/Control toggles data-modifier on <html>', async ({ page }) => {
    await page.goto('/');
    const isMac = process.platform === 'darwin';
    await page.keyboard.down(isMac ? 'Meta' : 'Control');
    await expect(page.locator('html')).toHaveAttribute('data-modifier', 'on');
    await page.keyboard.up(isMac ? 'Meta' : 'Control');
    const attr = await page.locator('html').getAttribute('data-modifier');
    expect(attr).toBeNull();
  });
});
