import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

interface MigrationResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly calls: string[];
}

function runMigration(schema: string, schemaExitCode = 0): MigrationResult {
  const root = mkdtempSync(join(tmpdir(), 'studio-d1-migration-'));
  try {
    const scripts = join(root, 'scripts');
    const fakeBin = join(root, 'fake-bin');
    const callLog = join(root, 'calls.log');
    mkdirSync(scripts);
    mkdirSync(fakeBin);
    writeFileSync(join(scripts, 'migrate-d1.sh'), readFileSync('scripts/migrate-d1.sh', 'utf8'));
    writeFileSync(
      join(fakeBin, 'pnpm'),
      [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'printf \'%s\\n\' "$*" >> "$D1_CALL_LOG"',
        'if [[ "$*" == *"PRAGMA table_info(webmentions)"* ]]; then',
        '  printf \'%s\' "${D1_SCHEMA_RESPONSE:-}"',
        '  exit "${D1_SCHEMA_EXIT_CODE:-0}"',
        'fi',
        '',
      ].join('\n'),
    );
    chmodSync(join(fakeBin, 'pnpm'), 0o755);

    const result = spawnSync('bash', ['scripts/migrate-d1.sh', 'local', 'test-webmentions'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        D1_CALL_LOG: callLog,
        D1_SCHEMA_EXIT_CODE: String(schemaExitCode),
        D1_SCHEMA_RESPONSE: schema,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      },
    });
    const calls = readFileSync(callLog, 'utf8').trim().split('\n').filter(Boolean);
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      calls,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const invalidResponses = [
  ['malformed JSON', 'not-json', 0],
  ['empty output', '', 0],
  ['empty JSON array', '[]', 0],
  ['failed provider result', '[{"success":false,"results":[]}]', 0],
  ['missing provider success', '[{"results":[{"name":"id"}]}]', 0],
  ['provider command failure', '[{"success":true,"results":[{"name":"id"}]}]', 9],
] as const;

describe('D1 migration preflight', () => {
  test.each(invalidResponses)('%s stops before any schema writes', (_name, schema, exitCode) => {
    const result = runMigration(schema, exitCode);
    expect(result.status).not.toBe(0);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]).toContain('PRAGMA table_info(webmentions)');
    expect(result.calls.some((call) => call.includes('ALTER TABLE'))).toBe(false);
    expect(result.calls.some((call) => call.includes('migrations apply'))).toBe(false);
  });

  test('adds mention_type to a valid legacy schema before applying migrations', () => {
    const schema = JSON.stringify([
      { success: true, results: [{ name: 'id' }, { name: 'source_url' }] },
    ]);
    const result = runMigration(schema);

    expect(result.status).toBe(0);
    expect(result.calls).toHaveLength(3);
    expect(result.calls[0]).toContain('PRAGMA table_info(webmentions)');
    expect(result.calls[1]).toContain(
      "ALTER TABLE webmentions ADD COLUMN mention_type TEXT NOT NULL DEFAULT 'mention'",
    );
    expect(result.calls[2]).toContain('migrations apply test-webmentions');
  });

  test('current schema skips ALTER and applies migrations', () => {
    const schema = JSON.stringify([
      { success: true, results: [{ name: 'id' }, { name: 'mention_type' }] },
    ]);
    const result = runMigration(schema);

    expect(result.status).toBe(0);
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0]).toContain('PRAGMA table_info(webmentions)');
    expect(result.calls.some((call) => call.includes('ALTER TABLE'))).toBe(false);
    expect(result.calls[1]).toContain('migrations apply test-webmentions');
  });

  test('fresh database with no table skips ALTER and applies migrations', () => {
    const schema = JSON.stringify([{ success: true, results: [] }]);
    const result = runMigration(schema);

    expect(result.status).toBe(0);
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0]).toContain('PRAGMA table_info(webmentions)');
    expect(result.calls.some((call) => call.includes('ALTER TABLE'))).toBe(false);
    expect(result.calls[1]).toContain('migrations apply test-webmentions');
  });
});
