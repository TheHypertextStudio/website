import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('developer command contracts', () => {
  test('build generation has one owner and one Astro invocation', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    const build = readFileSync('scripts/build.sh', 'utf8');
    expect(pkg.scripts.prebuild).toBeUndefined();
    expect(pkg.scripts.build).toBe('bash scripts/build.sh');
    expect(build.match(/pnpm exec astro build/g)).toHaveLength(1);
    expect(build).not.toContain('pnpm run build');
    expect(build).not.toContain('words.sh');
  });

  test('dev-all starts the site and all five independent staging Worker configs', () => {
    const dev = readFileSync('scripts/dev.sh', 'utf8');
    const migrations = readFileSync('scripts/migrate-d1.sh', 'utf8');
    for (const worker of ['www', 'poem', 'webmention', 'micropub', 'oembed']) {
      expect(dev).toContain(`start ${worker}`);
    }
    expect(dev).toContain('wrangler dev --config "$1" --env staging');
    expect(dev).toContain('scripts/migrate-d1.sh" local DB');
    expect(migrations).toContain('d1 migrations apply "$DATABASE_NAME"');
    expect(migrations).toContain('ALTER TABLE webmentions ADD COLUMN mention_type');
    expect(dev).toContain('--persist-to ".wrangler/state/webmention"');
    expect(dev).toContain('portless run --force');
    expect(dev).toContain('ASTRO_DEV_BACKGROUND=0');
    expect(dev).not.toContain('cd "$dir"');
  });

  test('Make exposes the existing checks without a broken release target', () => {
    const makefile = readFileSync('Makefile', 'utf8');
    expect(makefile).toContain('ci:');
    expect(makefile).not.toContain('scripts/deploy.sh');
    expect(makefile).not.toContain('scripts/release.sh');
    expect(makefile).not.toMatch(/^release:/m);
  });
});
