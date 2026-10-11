import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

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
});
