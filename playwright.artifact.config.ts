import { defineConfig, devices } from '@playwright/test';

import { CI, sharedConfig, sharedUse, sharedWebServer } from './playwright.shared';

const baseURL = 'http://127.0.0.1:4323';

export default defineConfig({
  ...sharedConfig,
  testDir: './tests/artifact',
  forbidOnly: true,
  retries: CI ? 1 : 0,
  fullyParallel: true,
  outputDir: 'test-results/artifact',
  use: { ...sharedUse, baseURL },
  projects: [{ name: 'artifact-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    ...sharedWebServer,
    // The real Pages runtime, so _headers, _redirects, trailing-slash 308s and
    // 404.html are exercised by the same code path that serves production.
    command: `pnpm exec wrangler pages dev ${process.env.DIST_DIR || 'dist'} --port 4323 --ip 127.0.0.1`,
    url: baseURL,
    timeout: 120_000,
  },
});
