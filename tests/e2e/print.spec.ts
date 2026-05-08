import { expect, test } from '@playwright/test';

test.describe('Print stylesheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
  });

  test('hides the status bar', async ({ page }) => {
    const display = await page
      .locator('#status-bar')
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('hides the marquee', async ({ page }) => {
    const display = await page
      .locator('section.footer-marquee')
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test("hides each product entry's Read more button", async ({ page }) => {
    // The dialog the button opens is itself hidden under @media print
    // (it's a `<dialog>`); hiding its trigger removes a dead control from
    // the printed page.
    const display = await page
      .locator('.entry__more')
      .first()
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('inlines external link URLs after the link text via ::after', async ({ page }) => {
    // Verify the print rule is present in the loaded stylesheets, not its
    // computed output — Firefox's getComputedStyle returns the unresolved
    // `attr(href)` source rather than the evaluated string, so a computed
    // readout would only work on chromium/webkit. Reading the stylesheet
    // directly tests the same contract on every browser.
    const ruleExists = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let topRules: CSSRuleList;
        try {
          topRules = sheet.cssRules;
        } catch {
          continue; // CORS-locked stylesheet
        }
        for (const rule of Array.from(topRules)) {
          if (!(rule instanceof CSSMediaRule) || !rule.media.mediaText.includes('print')) {
            continue;
          }
          for (const inner of Array.from(rule.cssRules)) {
            if (!(inner instanceof CSSStyleRule)) continue;
            const isAfterOnExternalLink =
              inner.selectorText.includes('::after') && inner.selectorText.includes('a[href]');
            if (isAfterOnExternalLink && inner.style.content.includes('attr(href)')) {
              return true;
            }
          }
        }
      }
      return false;
    });
    expect(ruleExists).toBe(true);
  });
});
