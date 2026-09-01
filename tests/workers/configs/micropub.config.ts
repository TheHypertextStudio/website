import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({ wrangler: { configPath: './wrangler.toml', environment: 'micropub' } }),
  ],
  test: { include: ['tests/workers/micropub.test.ts'] },
});
