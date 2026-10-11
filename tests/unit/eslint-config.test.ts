import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint();

describe('product lint configuration', () => {
  it('excludes tooling checkouts from broad lint', async () => {
    for (const path of [
      'build/site-candidate/assets/app.js',
      '.superpowers/sdd/example/repos/app/src/page.ts',
      '.studio-engine/tests/fixture.ts',
      '.studio-source/apps/web/page.tsx',
      '.claude/worktrees/example/src/worker.ts',
    ]) {
      expect(await eslint.isPathIgnored(path), path).toBe(true);
    }
  });

  it('keeps product sources in lint scope', async () => {
    for (const path of ['src/lib/worker.ts', 'src/pages/index.astro', 'workers/www/index.ts']) {
      expect(await eslint.isPathIgnored(path), path).toBe(false);
    }
  });

  it('preserves accessibility rules and failing diagnostics', async () => {
    const config = await eslint.calculateConfigForFile('src/pages/index.astro');
    const enabled = Object.entries(config.rules).filter(
      ([name, value]) => name.startsWith('astro/jsx-a11y/') && value[0] > 0,
    );
    expect(enabled.map(([name]) => name).sort()).toEqual([
      'astro/jsx-a11y/alt-text',
      'astro/jsx-a11y/anchor-has-content',
      'astro/jsx-a11y/anchor-is-valid',
      'astro/jsx-a11y/aria-activedescendant-has-tabindex',
      'astro/jsx-a11y/aria-props',
      'astro/jsx-a11y/aria-proptypes',
      'astro/jsx-a11y/aria-role',
      'astro/jsx-a11y/aria-unsupported-elements',
      'astro/jsx-a11y/autocomplete-valid',
      'astro/jsx-a11y/click-events-have-key-events',
      'astro/jsx-a11y/heading-has-content',
      'astro/jsx-a11y/html-has-lang',
      'astro/jsx-a11y/iframe-has-title',
      'astro/jsx-a11y/img-redundant-alt',
      'astro/jsx-a11y/interactive-supports-focus',
      'astro/jsx-a11y/label-has-associated-control',
      'astro/jsx-a11y/media-has-caption',
      'astro/jsx-a11y/mouse-events-have-key-events',
      'astro/jsx-a11y/no-access-key',
      'astro/jsx-a11y/no-autofocus',
      'astro/jsx-a11y/no-distracting-elements',
      'astro/jsx-a11y/no-interactive-element-to-noninteractive-role',
      'astro/jsx-a11y/no-noninteractive-element-interactions',
      'astro/jsx-a11y/no-noninteractive-element-to-interactive-role',
      'astro/jsx-a11y/no-noninteractive-tabindex',
      'astro/jsx-a11y/no-static-element-interactions',
      'astro/jsx-a11y/role-has-required-aria-props',
      'astro/jsx-a11y/role-supports-aria-props',
      'astro/jsx-a11y/scope',
      'astro/jsx-a11y/tabindex-no-positive',
    ]);
    expect(enabled.every(([, value]) => value[0] === 2)).toBe(true);
    const [invalid] = await eslint.lintText(
      '<img src="/image.png" /><div aria-not-real="true" />',
      {
        filePath: 'src/pages/sample.astro',
      },
    );
    expect(invalid.messages.map(({ ruleId }) => ruleId).sort()).toEqual([
      'astro/jsx-a11y/alt-text',
      'astro/jsx-a11y/aria-props',
    ]);
    const [valid] = await eslint.lintText('<img src="/image.png" alt="A useful description" />', {
      filePath: 'src/pages/sample.astro',
    });
    expect(valid.messages).toEqual([]);
  });
});
