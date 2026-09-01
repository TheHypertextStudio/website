import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const FAKE_CURL = `#!/usr/bin/env bash
set -euo pipefail

url="\${!#}"
if [[ " $* " == *" --head "* ]]; then
  printf 'HTTP/2 308\\r\\nlocation: %s/about\\r\\n\\r\\n' "$FAKE_BASE_URL"
  exit 0
fi

actual=200
if [[ "$url" == *'/webmentions' ]]; then actual=400; fi
if [[ "$url" == "$FAKE_WWW_URL/about" ]]; then actual=308; fi
if [[ -n "\${FAKE_FAIL_FRAGMENT:-}" && "$url" == *"$FAKE_FAIL_FRAGMENT"* ]]; then actual=500; fi
printf '%s' "$actual"
`;

async function runSmoke(failFragment = '') {
  const root = await mkdtemp(join(tmpdir(), 'hypertext-smoke-test-'));
  const fakeBin = join(root, 'bin');
  const report = join(root, 'smoke.tsv');
  await mkdir(fakeBin);
  const curl = join(fakeBin, 'curl');
  await writeFile(curl, FAKE_CURL);
  await chmod(curl, 0o755);

  const result = spawnSync('bash', ['scripts/smoke.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      BASE_URL: 'https://example.test',
      FAKE_BASE_URL: 'https://example.test',
      FAKE_FAIL_FRAGMENT: failFragment,
      FAKE_WWW_URL: 'https://www.example.test',
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
      SMOKE_REPORT_FILE: report,
      WWW_URL: 'https://www.example.test',
    },
  });

  return { report: await readFile(report, 'utf8'), result };
}

describe('production smoke report', () => {
  test('records all eight successful production checks', async () => {
    const { report, result } = await runSmoke();
    const rows = report.trim().split('\n');

    expect(result.status).toBe(0);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toBe('label\texpected\tactual\turl\tresult');
    expect(rows.slice(1).every((row) => row.endsWith('\tsuccess'))).toBe(true);
  });

  test('continues after a failed endpoint and returns a failing exit status', async () => {
    const { report, result } = await runSmoke('/api/poem');
    const rows = report.trim().split('\n');

    expect(result.status).toBe(1);
    expect(rows).toHaveLength(9);
    expect(rows.find((row) => row.startsWith('Poem API\t'))).toBe(
      'Poem API\t200\t500\thttps://example.test/api/poem\tfailure',
    );
    expect(rows.at(-1)).toContain('success');
  });
});
