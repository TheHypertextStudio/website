import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    files: ['*.astro/*.ts', '**/*.astro/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    ignores: ['dist/**', '.astro/**', '.wrangler/**', 'node_modules/**', 'pnpm-lock.yaml'],
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
];
