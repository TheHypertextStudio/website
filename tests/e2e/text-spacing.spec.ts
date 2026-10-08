import { expect, test } from '@playwright/test';

const TEXT_GROUPS = [
  { path: '/', selector: '.home-person', name: 'homepage introduction' },
  { path: '/services/', selector: '.hx-service-next', name: 'services contact' },
  {
    path: '/services/',
    selector: 'section[aria-labelledby="service-redesign"]',
    name: 'software redesign',
  },
  {
    path: '/services/',
    selector: 'section[aria-labelledby="service-ai"]',
    name: 'AI consulting',
  },
  { path: '/services/', selector: '.hx-development-detail > div', name: 'development' },
  { path: '/about/', selector: '.about-copy', name: 'about page' },
];

for (const width of [390, 1440]) {
  for (const group of TEXT_GROUPS) {
    test(`${group.name} keeps related paragraphs together at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(group.path);
      await page.evaluate(() => document.fonts.ready);
      const paragraphs = page.locator(`${group.selector} > p`);
      await expect(paragraphs).toHaveCount(2);
      const first = await paragraphs.nth(0).boundingBox();
      const second = await paragraphs.nth(1).boundingBox();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      const gap = second!.y - first!.y - first!.height;
      expect(gap).toBeGreaterThanOrEqual(12);
      expect(gap).toBeLessThanOrEqual(20);
    });
  }
}

test('longer questions do not stretch the desktop consulting paragraphs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/services/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.hx-consulting-questions li').evaluateAll((items) => {
    for (const item of items) {
      item.append(
        ' What would this change mean for the people using our product, and what would we need to maintain after launch?'.repeat(
          3,
        ),
      );
    }
  });
  const paragraphs = page.locator('.hx-consulting-copy > p');
  const first = await paragraphs.nth(0).boundingBox();
  const second = await paragraphs.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y - first!.y - first!.height).toBeLessThanOrEqual(20);
});
