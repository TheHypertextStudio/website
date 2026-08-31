import { expect, test } from '@playwright/test';
import { readJsonLd } from '../fixtures/utils';

test('an unconfigured build publishes no Bluesky reference', async ({ page }) => {
  for (const path of ['/', '/contact', '/studies/curfew-the-locked-delay']) {
    await page.goto(path);
    await expect(page.locator('a[href*="bsky.app/profile"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Bluesky');
  }

  await page.goto('/');
  const graph = await readJsonLd(page);
  const organization = graph.find(
    (node) => (node as { '@type'?: string })['@type'] === 'Organization',
  ) as { sameAs?: string[] } | undefined;
  expect(organization?.sameAs).not.toContain('https://bsky.app/profile/hypertext.studio');
});
