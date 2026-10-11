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
    // Serve the Astro build through Workers Static Assets so metadata,
    // headers, redirects and the custom 404 use the planned deployment path.
    command:
      'pnpm exec wrangler dev --config wrangler.jsonc --env staging --env-file /dev/null --port 4323 --ip 127.0.0.1 --inspector-port 9433',
    url: baseURL,
    timeout: 120_000,
  },
});
