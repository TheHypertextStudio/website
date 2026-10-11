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
  test('uses read-only package access and does not deploy from validation', () => {
    expect(ci).toContain('permissions:\n  contents: read\n  packages: read');
    expect(ci).not.toContain('wrangler deploy');
    expect(ci).not.toContain('environment:\n      name: production');
    expect(ci).toContain('upload-artifact');
    expect(ci).toContain('download-artifact');
    expect(ci).not.toContain('bash scripts/migrate-d1.sh remote hypertext-studio');
    expect(ci).not.toContain('bash scripts/smoke.sh');
    expect(ci).not.toContain('wrangler pages deploy');
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

  test('publishes rich job summaries without masking failed gates', () => {
    expect(ci).toContain('node scripts/ci/report.mjs quality');
    expect(ci).toContain('node scripts/ci/report.mjs build');
    expect(ci).not.toContain('node scripts/ci/report.mjs production');
    expect(ci).toContain('node scripts/ci/report.mjs workflow');
    expect(ci).toContain('node scripts/ci/report.mjs test');
    expect(ci).toContain('node scripts/ci/report.mjs browser');
    expect(ci).toContain('node scripts/ci/report.mjs artifact');
    expect(ci.match(/if: \$\{\{ always\(\) \}\}/g)?.length).toBeGreaterThanOrEqual(6);
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

  test('validates the downloaded build through Workers Static Assets', () => {
    expect(ci).toMatch(/\n  artifact:\n/);
    expect(ci).toContain('name: site-${{ github.sha }}');
    expect(ci).toContain('pnpm run test:artifact');
    expect(ci).toMatch(/\n  report:\n[\s\S]*needs: \[quality, test, browser, build, artifact\]/);
    expect(artifactPlaywright).toContain("testDir: './tests/artifact'");
    // Serve the downloaded Astro output using the deployment configuration.
    expect(artifactPlaywright).toContain('wrangler dev --config wrangler.jsonc');
    expect(ci).toContain('pnpm run build');
    expect(ci.match(/path: dist\//g)).toHaveLength(2);
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

  test('does not retain old Pages or support Worker deploy steps', () => {
    expect(ci).not.toContain('id: deploy_www');
    expect(ci).not.toContain('id: deploy_pages');
    expect(ci).not.toContain('Deploy the verified Pages artifact');
  });

  test('exposes artifact evidence to an always-run workflow receipt', () => {
    expect(ci).toContain('artifact-url: ${{ steps.site_artifact.outputs.artifact-url }}');
    expect(ci).toContain('artifact-digest: ${{ steps.site_artifact.outputs.artifact-digest }}');
    expect(ci).toMatch(/\n  report:\n[\s\S]*needs: \[quality, test, browser, build, artifact\]/);
  });

  test('uses the aggregate Worker runner instead of short-circuiting chained suites', () => {
    expect(packageJson.scripts['test:workers']).toBe('node scripts/ci/run-worker-tests.mjs');
  });
});
