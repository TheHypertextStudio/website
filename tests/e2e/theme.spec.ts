import { expect, test } from '@playwright/test';

function rgbChannels(value: string): [number, number, number] {
  const channels = value
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (!channels || channels.length !== 3)
    throw new Error(`Expected an RGB color, received ${value}`);
  return channels as [number, number, number];
}

function luminance(value: string): number {
  const channels = rgbChannels(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('follows the operating-system color scheme with readable semantic colors', async ({
  page,
}) => {
  const themes = new Map<
    string,
    { background: string; text: string; secondary: string; panels: string[] }
  >();

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');

    const colors = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      secondary: getComputedStyle(document.querySelector('.product-card__detail')!).color,
      panels: [...document.querySelectorAll<HTMLElement>('.product-card__media')].map(
        (panel) => getComputedStyle(panel).backgroundColor,
      ),
    }));

    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(7);
    expect(contrast(colors.secondary, colors.background)).toBeGreaterThanOrEqual(4.5);
    themes.set(colorScheme, colors);
  }

  expect(themes.get('dark')!.background).not.toBe(themes.get('light')!.background);
  expect(themes.get('dark')!.text).not.toBe(themes.get('light')!.text);
  expect(themes.get('dark')!.panels).not.toEqual(themes.get('light')!.panels);
});

test('uses warm charcoal instead of neutral black for the primary ink and dark canvas', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const light = await page.evaluate(() => ({
    text: getComputedStyle(document.body).color,
    link: getComputedStyle(document.querySelector<HTMLElement>('.site-header a')!).color,
  }));

  expect(light.text).toBe('rgb(37, 35, 31)');
  expect(light.link).toBe('rgb(37, 35, 31)');

  const headerLink = page.locator('.site-header a').first();
  await headerLink.focus();
  await expect(headerLink).toBeFocused();
  await expect.poll(() => headerLink.evaluate((link) => link.matches(':focus-visible'))).toBe(true);
  const focusedBackground = await headerLink
    .locator('.interaction-label')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(focusedBackground).toBe('rgb(37, 35, 31)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(24, 23, 19)');
});

test('advertises matching light and dark browser chrome colors', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
  await expect(
    page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),
  ).toHaveAttribute('content', '#FBFBFA');
  await expect(
    page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'),
  ).toHaveAttribute('content', '#181713');
});

test('distinguishes the footer with a readable borderless surface in both themes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');

    const colors = await page.evaluate(() => ({
      page: getComputedStyle(document.body).backgroundColor,
      footer: getComputedStyle(document.querySelector('.site-footer')!).backgroundColor,
      text: getComputedStyle(document.querySelector('.site-footer')!).color,
    }));

    expect(colors.footer).not.toBe(colors.page);
    expect(contrast(colors.text, colors.footer)).toBeGreaterThanOrEqual(7);
  }
});
