import { describe, expect, test } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('common setup entrypoint', () => {
  test('declares only the native dependency builds already owned by bootstrap', () => {
    const policy = readFileSync('pnpm-workspace.yaml', 'utf8');
    const allowed = [...policy.matchAll(/^  ([a-z][a-z-]*): true$/gm)].map((match) => match[1]);
    expect(allowed.sort()).toEqual(['esbuild', 'sharp', 'workerd']);
    expect(policy).toMatch(/^allowBuilds:\n/);
    expect(policy).not.toContain('dangerouslyAllowAllBuilds');
    const bootstrap = readFileSync('scripts/bootstrap-worktree', 'utf8');
    expect(bootstrap).toContain('exec pnpm rebuild esbuild workerd sharp');
  });

  test.each([
    { args: ['packages', 'setup'] },
    { args: ['packages', 'check', '@thehypertextstudio/web-config'] },
    { args: ['worktree', 'plan', '--json'] },
  ])('forwards $args to the shared engine and preserves its exit status', ({ args }) => {
    const root = mkdtempSync(join(tmpdir(), 'studio-bootstrap-'));
    try {
      mkdirSync(join(root, 'scripts'));
      copyFileSync('bootstrap', join(root, 'bootstrap'));
      writeFileSync(
        join(root, 'scripts/bootstrap-worktree-engine'),
        '#!/bin/sh\npwd\nprintf "%s\\n" "$@"\nexit 7\n',
        { mode: 0o755 },
      );
      const result = spawnSync(join(root, 'bootstrap'), args, {
        cwd: tmpdir(),
        encoding: 'utf8',
      });
      expect(result.status).toBe(7);
      expect(result.stdout.trim().split('\n')).toEqual([root, ...args]);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
