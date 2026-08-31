import { expect, test } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import { PAGES } from '../fixtures/site';

for (const p of PAGES) {
  test(`@a11y ${p.path} passes axe (wcag2aa + wcag22aa + best-practice)`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: false,
      detailedReportOptions: { html: false },
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'],
        },
      },
    });
  });
}

test('@a11y the 404 page passes axe', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await injectAxe(page);
  await checkA11y(page, undefined, {
    detailedReport: false,
    detailedReportOptions: { html: false },
    axeOptions: {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    },
  });
});
