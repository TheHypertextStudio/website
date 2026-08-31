import { expect, test } from '@playwright/test';

test.describe('Print stylesheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
  });

  test('hides the site footer', async ({ page }) => {
    const display = await page
      .locator('footer.site-footer')
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('keeps product cards together', async ({ page }) => {
    const breakInside = await page
      .locator('.product-card')
      .first()
      .evaluate((el) => getComputedStyle(el).breakInside);
    expect(breakInside).toBe('avoid');
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
