import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('legacy interaction cleanup', () => {
  test('citations expose only rendered content, not deleted hovercard hooks', () => {
    const citations = readFileSync('src/components/Citations.astro', 'utf8');
    for (const marker of [
      'data-hovercard',
      'data-hovercard-skip',
      'data-author=',
      'data-source=',
      'data-date=',
      'data-excerpt=',
    ]) {
      expect(citations).not.toContain(marker);
    }
    for (const microformat of ['h-cite', 'p-author', 'dt-published', 'u-url', 'e-content']) {
      expect(citations).toContain(microformat);
    }
  });

  test('the screenshot harness targets the current launch components', () => {
    const screenshots = readFileSync('scripts/screenshots.mjs', 'utf8');
    for (const removedSelector of [
      'section.thesis',
      'section.colophon',
      'section.status-panel',
      '.footer-wordmark',
      'figure.poem',
      'small.small-print',
      'data-slug=',
      'status-bar',
      'data-dialog-target',
      'palette-input',
      'shortcut-sheet',
      'work-heading',
      'studio-footer',
    ]) {
      expect(screenshots).not.toContain(removedSelector);
    }
    expect(screenshots).toContain('.home-hero');
    expect(screenshots).toContain('.site-footer');
    expect(screenshots).toContain('.footer-directory');
    expect(screenshots).toContain("{ slug: 'notes', path: '/notes' }");
    expect(screenshots).toContain('response.status()');
    expect(screenshots).not.toContain('.catch(() => {})');
    expect(screenshots).toContain("from '@playwright/test'");
    expect(screenshots).not.toContain("from 'playwright'");
  });
});
