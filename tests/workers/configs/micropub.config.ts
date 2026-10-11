import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './workers/micropub/wrangler.toml', environment: 'staging' },
    }),
  ],
  test: { include: ['tests/workers/micropub.test.ts'] },
});
