import { defineConfig, devices } from '@playwright/test';

import { CI, sharedConfig, sharedUse, sharedWebServer } from './playwright.shared';

const EXTERNAL_BASE_URL = process.env.BASE_URL;
const TEST_BASE_URL = EXTERNAL_BASE_URL ?? 'http://127.0.0.1:4322';

export default defineConfig({
  ...sharedConfig,
  testDir: './tests',
  // Unit and workerd suites have their own Vitest runners. Keeping them out
  // of Playwright prevents Node from trying to load Cloudflare runtime modules.
  testIgnore: ['**/artifact/**', '**/unit/**', '**/workers/**'],
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  // Serial in CI: three browser projects against one dev server, zero flake budget.
  fullyParallel: !CI,
  workers: CI ? 1 : undefined,

  use: {
    ...sharedUse,
    baseURL: TEST_BASE_URL,
    video: CI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        ...sharedWebServer,
        command: 'pnpm exec astro dev --ignore-lock --host 127.0.0.1 --port 4322',
        url: TEST_BASE_URL,
        // Tests against [slug] routes require fixture content. The public build
        // does not set this; see src/content.config.ts for the contract.
        env: {
          HYPERTEXT_INCLUDE_FIXTURES: '1',
          // Bluesky is opt-in. Tests exercise the default unconfigured build.
          BLUESKY_HANDLE: '',
          // Astro 7 backgrounds dev servers in detected agent environments.
          // Playwright owns this process and requires it to stay in the foreground.
          ASTRO_DEV_BACKGROUND: '0',
        },
      },
});
