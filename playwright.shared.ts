import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Settings the browser suite and the artifact suite share.
 *
 * They stay separate configs because they serve different things on different
 * ports, but a reporter, timeout, or diagnostic change has to reach both — the
 * CI job summary silently goes missing from one suite otherwise.
 */
export const CI = !!process.env.CI;

const reporter: PlaywrightTestConfig['reporter'] = CI
  ? [['github'], ['html', { open: 'never' }], ['./scripts/ci/playwright-summary-reporter.mjs']]
  : 'list';

/**
 * Spread into each `defineConfig()`. Deliberately excludes parallelism
 * (`fullyParallel` / `workers`): those two are one policy and each suite states
 * them together, next to the server it runs against.
 */
export const sharedConfig: PlaywrightTestConfig = {
  reporter,
  timeout: 30_000,
  expect: { timeout: 5_000 },
};

/** Spread into each config's `use`. */
export const sharedUse: PlaywrightTestConfig['use'] = {
  screenshot: 'only-on-failure',
  trace: 'on-first-retry',
};

/** Spread into each config's `webServer`; each supplies its own command and url. */
export const sharedWebServer = {
  reuseExistingServer: false,
  stdout: 'ignore',
  stderr: 'pipe',
  timeout: 30_000,
} as const;
