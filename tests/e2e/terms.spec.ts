import { expect, test } from '@playwright/test';

test('website terms are discoverable and use the shared eleven-section structure', async ({
  page,
}) => {
  await page.goto('/privacy/');
  await page
    .getByRole('navigation', { name: 'Policy navigation' })
    .getByRole('link', { name: 'Website terms' })
    .click();
  await expect(page).toHaveURL(/\/terms\/?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Website terms' })).toBeVisible();
  const sections = [
    'scope',
    'eligibility',
    'accounts',
    'content',
    'features',
    'billing',
    'acceptable-use',
    'changes',
    'warranty',
    'law',
    'contact',
  ];
  for (const id of sections) {
    await expect(page.locator(`h2#${id}`)).toBeAttached();
    await expect(page.locator(`h2#${id} a`)).toHaveAttribute('href', `#${id}`);
  }
  await expect(page.locator('main h2')).toHaveCount(11);
  await page.locator('h2#law a').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#law$/);
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Terms', exact: true }),
  ).toHaveAttribute('href', '/terms');
  for (const role of ['contact', 'support', 'legal']) {
    await expect(
      page.locator(`main a[href="mailto:${role}@hypertext.studio"]`).first(),
    ).toBeVisible();
  }
});

test('terms metadata and honest first-version history work without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/terms/');
  await expect(page.locator('main time[datetime="2026-10-14"]')).toHaveCount(1);
  await expect(page.locator('main time[datetime="2026-11-13"]')).toHaveCount(1);
  await page
    .getByRole('navigation', { name: 'Policy navigation' })
    .getByRole('link', { name: 'Policy history' })
    .click();
  await expect(page.locator('main')).toContainText('there is no previous version to archive');
  await page.getByRole('link', { name: 'Current website terms' }).click();
  await expect(page.locator('main')).toContainText('1810 East Sahara Avenue STE 75246');
  await expect(page.locator('main')).toContainText('free');
  await context.close();
});

for (const width of [320, 390]) {
  test(`website terms fit a ${width}px viewport with addressable sections and keyboard navigation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/terms/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    // The native site hides heading permalink controls at touch widths.
    // Direct fragment destinations and the ordinary policy navigation remain usable.
    await page.goto('/terms/#law');
    await expect(page.locator('h2#law')).toBeVisible();
    const history = page
      .getByRole('navigation', { name: 'Policy navigation' })
      .getByRole('link', { name: 'Policy history' });
    await history.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/legal\/history\/?$/);
  });
}
