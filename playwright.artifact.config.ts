import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4323';

export default defineConfig({
  testDir: './tests/artifact',
  forbidOnly: true,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['./scripts/ci/playwright-summary-reporter.mjs']]
    : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: 'test-results/artifact',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'artifact-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/ci/serve-dist.mjs',
    url: baseURL,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 30_000,
  },
});
