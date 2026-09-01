import { describe, expect, test } from 'vitest';

import { renderPlaywrightSummary } from '../../scripts/ci/playwright-summary-reporter.mjs';

describe('Playwright job summary', () => {
  test('groups outcomes by browser and reports the full-run duration', () => {
    const markdown = renderPlaywrightSummary(
      [
        { outcome: 'expected', project: 'chromium' },
        { outcome: 'flaky', project: 'chromium' },
        { outcome: 'skipped', project: 'firefox' },
        { outcome: 'unexpected', project: 'webkit' },
      ],
      { duration: 65_000, status: 'failed' },
    );

    expect(markdown).toContain('**Overall:** ❌ Failed · **4 tests** · 1m 5s');
    expect(markdown).toContain('| chromium | 1 | 0 | 1 | 0 | 2 |');
    expect(markdown).toContain('| firefox | 0 | 0 | 0 | 1 | 1 |');
    expect(markdown).toContain('| webkit | 0 | 1 | 0 | 0 | 1 |');
  });

  test('escapes project names before placing them in Markdown tables', () => {
    const markdown = renderPlaywrightSummary(
      [{ outcome: 'expected', project: 'mobile | chrome' }],
      { duration: 10, status: 'passed' },
    );

    expect(markdown).toContain('| mobile \\| chrome | 1 | 0 | 0 | 0 | 1 |');
  });

  test('distinguishes an interrupted run from a test failure', () => {
    const markdown = renderPlaywrightSummary([], { duration: 1_000, status: 'interrupted' });

    expect(markdown).toContain('**Overall:** ⏹️ Cancelled · **0 tests** · 1s');
  });
});
