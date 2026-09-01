import type { Page } from '@playwright/test';

/** Use Meta on macOS/WebKit and Control elsewhere for platform-native shortcuts. */
export const PALETTE_KEY = process.platform === 'darwin' ? 'Meta+k' : 'Control+k';

/**
 * Fire a sequence shortcut (e.g. 'g h') by pressing each character with a tiny
 * delay so the page's keydown listener treats them as a sequence, not a key
 * combination.
 */
export async function pressSequence(page: Page, sequence: string): Promise<void> {
  for (const ch of sequence.replace(/\s+/g, '')) {
    await page.keyboard.press(ch);
    await page.waitForTimeout(40);
  }
}

/** Resolve the JSON-LD `@graph` from the first `<script type="application/ld+json">`. */
export async function readJsonLd(page: Page): Promise<unknown[]> {
  const text = await page.locator('script[type="application/ld+json"]').first().textContent();
  if (!text) return [];
  const data = JSON.parse(text) as { '@graph'?: unknown[] };
  return Array.isArray(data['@graph']) ? data['@graph'] : [];
}
