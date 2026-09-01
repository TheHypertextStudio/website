import { expect, test } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';

const ROUTES = ['/studies/curfew-launch', '/notes/2026-04-08-on-finishing'];

test.describe.configure({ timeout: 60_000 });

for (const route of ROUTES) {
  test(`@a11y ${route} passes axe (wcag2aa + wcag22aa + best-practice)`, async ({
    page,
  }, testInfo) => {
    // Astro's first on-demand compilation can trigger one development reload.
    // Wait for the network to settle before injecting axe so the analysis runs
    // in the final document rather than the context being replaced mid-scan.
    const res = await page.goto(route, { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await injectAxe(page);
    const violations = await getViolations(page, undefined, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'],
      },
    });
    if (violations.length > 0) {
      const summary = violations
        .map(
          (v) =>
            `- ${v.id} (${v.impact}): ${v.help}\n    nodes: ${v.nodes.length}\n    target: ${v.nodes[0]?.target.join(' ') ?? '<unknown>'}`,
        )
        .join('\n');
      await testInfo.attach('axe-violations.txt', {
        body: summary,
        contentType: 'text/plain',
      });
    }
    expect(violations).toEqual([]);
  });
}

test('@a11y colophon respond note is reachable by keyboard from the article', async ({ page }) => {
  await page.goto('/studies/curfew-launch');
  // Tab from the start of the document; the syndication links inside the
  // colophon must reach focus without trapping or skipping.
  const syndicationLink = page.locator('aside.post-colophon a.u-syndication').first();
  await expect(syndicationLink).toBeAttached();
  await syndicationLink.focus();
  await expect(syndicationLink).toBeFocused();
});
