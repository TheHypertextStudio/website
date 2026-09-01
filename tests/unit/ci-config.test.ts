import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const codeql = readFileSync('.github/workflows/codeql.yml', 'utf8');
const setup = readFileSync('.github/actions/setup/action.yml', 'utf8');

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

  test('deploys only from main push or an explicit main dispatch', () => {
    expect(ci).toContain("github.ref == 'refs/heads/main'");
    expect(ci).toContain("github.event_name == 'push' || github.event_name == 'workflow_dispatch'");
    expect(ci).not.toContain('paths:');
  });
});
