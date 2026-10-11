import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

describe('common setup entrypoint', () => {
  test('bootstrap delegates local setup to the pinned shared lifecycle only', () => {
    const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');
    expect(bootstrap).toContain('exec "$REPO_ROOT/run" setup');
    expect(bootstrap).not.toContain('wrangler');
    expect(bootstrap).not.toContain('CLOUDFLARE_PAGES_PROJECT');
    expect(bootstrap).not.toContain('secret put');
  });
});
