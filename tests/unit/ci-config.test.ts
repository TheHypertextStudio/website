import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import artifactConfig from '../../playwright.artifact.config';
import browserConfig from '../../playwright.config';
import { sharedConfig } from '../../playwright.shared';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const codeql = readFileSync('.github/workflows/codeql.yml', 'utf8');
const setup = readFileSync('.github/actions/setup/action.yml', 'utf8');
const playwright = readFileSync('playwright.config.ts', 'utf8');
const artifactPlaywright = readFileSync('playwright.artifact.config.ts', 'utf8');
const sharedPlaywright = readFileSync('playwright.shared.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('portable CI policy', () => {
  test('uses least privilege, protected production, one artifact, migrations, and smoke checks', () => {
    expect(ci).toContain('permissions:\n  contents: read');
    expect(ci).toContain('environment:\n      name: production');
    expect(ci).toContain('upload-artifact');
    expect(ci).toContain('download-artifact');
    expect(ci).toContain('bash scripts/migrate-d1.sh remote hypertext-studio');
    expect(ci).toContain('bash scripts/smoke.sh');
  });

  test('pins every external action to an immutable commit SHA', () => {
    for (const workflow of [ci, codeql, setup]) {
      const uses = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)]
        .map((match) => match[1])
        .filter((action) => !action.startsWith('./'));
      expect(uses.length).toBeGreaterThan(0);
      for (const action of uses) expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
  });

  test('does not ask setup-node to run pnpm before Corepack enables it', () => {
    expect(setup).toContain('package-manager-cache: false');
  });

  test('uses artifact action releases packaged for the supported Node runtime', () => {
    expect(ci).toMatch(/actions\/upload-artifact@[a-f0-9]{40} # v7/);
    expect(ci).toMatch(/actions\/download-artifact@[a-f0-9]{40} # v8/);
  });

  test('keeps well-known metadata in the immutable production artifact', () => {
    expect(ci).toContain('include-hidden-files: true');
  });

  test('deploys only from main push or an explicit main dispatch', () => {
    expect(ci).toContain("github.ref == 'refs/heads/main'");
    expect(ci).toContain("github.event_name == 'push' || github.event_name == 'workflow_dispatch'");
    expect(ci).not.toContain('paths:');
  });

  test('publishes rich job summaries without masking failed gates', () => {
    expect(ci).toContain('node scripts/ci/report.mjs quality');
    expect(ci).toContain('node scripts/ci/report.mjs build');
    expect(ci).toContain('node scripts/ci/report.mjs production');
    expect(ci).toContain('node scripts/ci/report.mjs workflow');
    expect(ci).toContain('node scripts/ci/report.mjs test');
    expect(ci).toContain('node scripts/ci/report.mjs browser');
    expect(ci).toContain('node scripts/ci/report.mjs artifact');
    expect(ci.match(/if: \$\{\{ always\(\) \}\}/g)?.length).toBeGreaterThanOrEqual(7);
    expect(codeql).toContain('node scripts/ci/report.mjs codeql');
  });

  test('keeps detailed browser diagnostics only for failed runs', () => {
    // Registered once, and actually reaching both suites: reference identity
    // proves neither config overrode the shared reporter list.
    expect(sharedPlaywright).toContain('./scripts/ci/playwright-summary-reporter.mjs');
    expect(browserConfig.reporter).toBe(sharedConfig.reporter);
    expect(artifactConfig.reporter).toBe(sharedConfig.reporter);
    expect(ci).toContain('name: playwright-failure-${{ github.sha }}');
    expect(ci).toContain("if: ${{ failure() && steps.browser_tests.outcome == 'failure' }}");
    expect(ci).not.toContain('if: ${{ failure() }}');
    expect(ci).toContain('playwright-report/');
    expect(ci).toContain('test-results/');
    expect(ci).toContain('if-no-files-found: warn');
    expect(ci).toContain("if: ${{ failure() && steps.artifact_tests.outcome == 'failure' }}");
  });

  test('allows every artifact upload to be retried within the same workflow run', () => {
    expect(ci.match(/overwrite: true/g)).toHaveLength(3);
  });

  test('validates the downloaded immutable artifact before production can use it', () => {
    expect(ci).toMatch(/\n  artifact:\n/);
    expect(ci).toContain('name: site-${{ github.sha }}');
    expect(ci).toContain('pnpm run test:artifact');
    expect(ci).toMatch(
      /\n  production:\n[\s\S]*needs: \[quality, test, browser, build, artifact\]/,
    );
    expect(ci).toMatch(
      /\n  report:\n[\s\S]*needs: \[quality, test, browser, build, artifact, production\]/,
    );
    expect(artifactPlaywright).toContain("testDir: './tests/artifact'");
    // The artifact gate must serve through the real Pages runtime, or it cannot
    // see _headers / _redirects and silently validates less than its name claims.
    expect(artifactPlaywright).toContain('wrangler pages dev');
    expect(packageJson.scripts['test:artifact']).toContain('playwright.artifact.config.ts');
    expect(playwright).toContain("'**/artifact/**'");
  });

  test('enforces an explicit zero-flake browser budget', () => {
    expect(ci).toContain('PLAYWRIGHT_FLAKE_BUDGET: 0');
  });

  test('runs ESLint only once while application typechecking owns Astro validation', () => {
    expect(packageJson.scripts.lint).toBe('eslint . --max-warnings=0');
    expect(packageJson.scripts.typecheck).toContain('astro check');
  });

  test('reports each fail-closed production stage separately', () => {
    for (const id of [
      'checkout',
      'setup',
      'download_artifact',
      'migrate',
      'deploy_www',
      'deploy_poem',
      'deploy_webmention',
      'deploy_micropub',
      'deploy_oembed',
      'deploy_pages',
      'smoke',
    ]) {
      expect(ci).toContain(`id: ${id}`);
    }
  });

  test('exposes artifact evidence to an always-run workflow receipt', () => {
    expect(ci).toContain('artifact-url: ${{ steps.site_artifact.outputs.artifact-url }}');
    expect(ci).toContain('artifact-digest: ${{ steps.site_artifact.outputs.artifact-digest }}');
    expect(ci).toMatch(
      /\n  report:\n[\s\S]*needs: \[quality, test, browser, build, artifact, production\]/,
    );
    expect(ci).toContain('PRODUCTION_RESULT: ${{ needs.production.result }}');
  });

  test('uses the aggregate Worker runner instead of short-circuiting chained suites', () => {
    expect(packageJson.scripts['test:workers']).toBe('node scripts/ci/run-worker-tests.mjs');
  });
});
