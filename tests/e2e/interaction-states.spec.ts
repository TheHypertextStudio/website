import { expect, test, type Locator, type Page } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

type Scheme = 'light' | 'dark';

async function resolveTokenColor(locator: Locator, token: string): Promise<string> {
  return locator.evaluate((element, property) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${property})`;
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

async function focusWithKeyboard(_page: Page, locator: Locator): Promise<void> {
  // Playwright's focus action activates :focus-visible for keyboard-focusable
  // controls in all three engines. Moving away and back with Tab is unreliable
  // in WebKit because its link-tab order follows the host's keyboard settings.
  await locator.focus();
  await expect(locator).toBeFocused();
  await expect
    .poll(() => locator.evaluate((element) => element.matches(':focus-visible')))
    .toBe(true);
}

test.describe('Reverse-video interaction system', () => {
  for (const scheme of ['light', 'dark'] as const satisfies readonly Scheme[]) {
    test(`structural links use reverse video for keyboard focus in ${scheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/about');

      const pageColors = await page.locator('body').evaluate((body) => {
        const style = getComputedStyle(body);
        return { background: style.backgroundColor, text: style.color };
      });

      const links = [
        page.locator('.skip-link'),
        page.locator('.site-wordmark'),
        page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'About' }),
        page.getByRole('link', { name: 'Willie Chalmers III' }),
        page.getByRole('navigation', { name: 'Studio' }).getByRole('link', { name: 'Support' }),
      ];

      for (const link of links) {
        await focusWithKeyboard(page, link);
        const focused = await link.evaluate((element) => {
          const painted = element.querySelector<HTMLElement>('.interaction-label') ?? element;
          const style = getComputedStyle(painted);
          return {
            background: style.backgroundColor,
            color: style.color,
            outline: style.outlineStyle,
            shadow: style.boxShadow,
            paddingInline: Number.parseFloat(style.paddingInlineStart),
          };
        });

        expect(focused.background).toBe(pageColors.text);
        expect(focused.color).toBe(pageColors.background);
        expect(focused.outline).toBe('none');
        expect(focused.shadow).toBe('none');
        expect(focused.paddingInline).toBeGreaterThan(0);
      }
    });
  }

  test('hover uses a quiet wash without reversing link colors', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const links = [
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'About' }),
      page.locator('#docket .product-card__footer a'),
      page.getByRole('navigation', { name: 'Products' }).getByRole('link', { name: 'Docket' }),
    ];

    for (const link of links) {
      const resting = await link.evaluate((element) => {
        const painted = element.querySelector<HTMLElement>('.interaction-label') ?? element;
        const style = getComputedStyle(painted);
        return { background: style.backgroundColor, color: style.color };
      });

      await link.hover();
      const hovered = await link.evaluate((element) => {
        const painted = element.querySelector<HTMLElement>('.interaction-label') ?? element;
        const style = getComputedStyle(painted);
        return {
          background: style.backgroundColor,
          color: style.color,
          paddingInline: Number.parseFloat(style.paddingInlineStart),
        };
      });

      expect(hovered.background).not.toBe(resting.background);
      expect(hovered.color).toBe(resting.color);
      expect(hovered.background).not.toBe(resting.color);
      expect(hovered.paddingInline).toBeGreaterThan(0);
      await expect
        .poll(() =>
          link.evaluate((element) => {
            const label =
              element.querySelector<HTMLElement>('.footer-link__label') ??
              element.querySelector<HTMLElement>('.interaction-label');
            return getComputedStyle(label ?? element).textDecorationThickness;
          }),
        )
        .toBe('2px');
    }
  });

  test('product destinations use their own accent for keyboard focus', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    for (const product of PRODUCTS) {
      const expectedBackground = await resolveTokenColor(
        page.locator('body'),
        `--color-${product.slug}`,
      );
      const expectedText = await resolveTokenColor(
        page.locator('body'),
        `--color-${product.slug}-ink`,
      );
      const links = [
        page.locator(`#${product.slug} .product-card__footer a`),
        page
          .getByRole('navigation', { name: 'Products' })
          .getByRole('link', { name: product.name }),
      ];

      for (const link of links) {
        await focusWithKeyboard(page, link);
        const focused = await link.evaluate((element) => {
          const painted = element.querySelector<HTMLElement>('.interaction-label') ?? element;
          const style = getComputedStyle(painted);
          return {
            background: style.backgroundColor,
            color: style.color,
            outline: style.outlineStyle,
            shadow: style.boxShadow,
            paddingInline: Number.parseFloat(style.paddingInlineStart),
          };
        });

        expect(focused.background).toBe(expectedBackground);
        expect(focused.color).toBe(expectedText);
        expect(focused.outline).toBe('none');
        expect(focused.shadow).toBe('none');
        expect(focused.paddingInline).toBeGreaterThan(0);
      }
    }
  });

  test('button-like controls use the same reverse-video focus grammar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/about');
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'interaction-test-button';
      button.textContent = 'Print';
      document.querySelector('main')!.append(button);

      const details = document.createElement('details');
      details.innerHTML = '<summary id="interaction-test-summary">Details</summary><p>Text</p>';
      document.querySelector('main')!.append(details);
    });

    const pageColors = await page.locator('body').evaluate((body) => {
      const style = getComputedStyle(body);
      return { background: style.backgroundColor, text: style.color };
    });

    for (const selector of ['#interaction-test-button', '#interaction-test-summary']) {
      const control = page.locator(selector);
      await focusWithKeyboard(page, control);
      const focused = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          color: style.color,
          outline: style.outlineStyle,
          shadow: style.boxShadow,
          paddingInline: Number.parseFloat(style.paddingInlineStart),
        };
      });

      expect(focused.background).toBe(pageColors.text);
      expect(focused.color).toBe(pageColors.background);
      expect(focused.outline).toBe('none');
      expect(focused.shadow).toBe('none');
      expect(focused.paddingInline).toBeGreaterThan(0);
    }
  });

  test('mobile link labels stay compact inside accessible touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const links = [
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'About' }),
      page.locator('#docket .product-card__footer a'),
    ];

    for (const link of links) {
      const label = link.locator('.interaction-label');
      await expect(label).toHaveCount(1);
      await focusWithKeyboard(page, link);

      const geometry = await link.evaluate((element) => {
        const labelElement = element.querySelector<HTMLElement>('.interaction-label')!;
        const target = element.getBoundingClientRect();
        const painted = labelElement.getBoundingClientRect();
        const targetStyle = getComputedStyle(element);
        const labelStyle = getComputedStyle(labelElement);
        return {
          targetHeight: target.height,
          paintedHeight: painted.height,
          targetBackground: targetStyle.backgroundColor,
          targetShadow: targetStyle.boxShadow,
          paintedBackground: labelStyle.backgroundColor,
          paintedShadow: labelStyle.boxShadow,
          paintedPaddingInline: Number.parseFloat(labelStyle.paddingInlineStart),
        };
      });

      expect(geometry.targetHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.paintedHeight).toBeLessThan(geometry.targetHeight);
      expect(geometry.targetBackground).toBe('rgba(0, 0, 0, 0)');
      expect(geometry.targetShadow).toBe('none');
      expect(geometry.paintedBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(geometry.paintedShadow).toBe('none');
      expect(geometry.paintedPaddingInline).toBeGreaterThan(0);
    }
  });
});
