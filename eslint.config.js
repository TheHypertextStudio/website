import studioBase from '@thehypertextstudio/web-config/eslint/node';
import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  ...studioBase,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    files: ['*.astro/*.ts', '**/*.astro/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    ignores: [
      '.astro/**',
      '.hypertext/**',
      '.wrangler/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'pnpm-lock.yaml',
    ],
  },
  {
    // Playwright serializes these callbacks into the browser.
    files: ['scripts/screenshots.mjs'],
    languageOptions: { globals: { window: 'readonly' } },
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // role="list" on <ul>/<ol> is technically redundant in HTML, but we
      // keep it as a Safari + VoiceOver workaround: when list-style is set
      // to none (which the studio's reset CSS does for navigational lists),
      // Safari drops the implicit list role. The explicit role restores it.
      'astro/jsx-a11y/no-redundant-roles': 'off',
    },
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    rules: { 'no-unused-vars': 'off' },
  },
];
