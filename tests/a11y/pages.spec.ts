import { expect, test } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
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

test('@a11y open product dialog passes axe', async ({ page }) => {
  await page.goto('/');
  await page.locator('button[data-dialog-target="logdate-detail"]').click();
  await injectAxe(page);
  await checkA11y(page, 'dialog#logdate-detail', {
    detailedReport: false,
    detailedReportOptions: { html: false },
    axeOptions: {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    },
  });
});

test('@a11y open command palette passes axe', async ({ page }, testInfo) => {
  // Disable the dialog open animation so axe samples the steady-state
  // rendering rather than a partial frame.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
  await page.locator('dialog#command-palette[open]').waitFor({ state: 'visible' });
  await injectAxe(page);
  const violations = await getViolations(page, 'dialog#command-palette', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  });
  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `- ${v.id}: ${v.help}\n    nodes: ${v.nodes.length}\n    failure: ${v.nodes[0]?.failureSummary?.replace(/\n/g, ' ') ?? ''}`,
      )
      .join('\n');
    await testInfo.attach('palette-axe.txt', { body: summary, contentType: 'text/plain' });
  }
  expect(violations).toEqual([]);
});
