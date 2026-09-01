import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

// A real, shellcheck-able script rather than a string: see the header there
// for the FAKE_* fault-injection contract.
const FAKE_BIN = resolve('tests/fixtures/fake-bin');

interface SmokeOptions {
  readonly badBodyFragment?: string;
  readonly failFragment?: string;
  readonly transientFragment?: string;
}

async function runSmoke(options: SmokeOptions = {}) {
  const root = await mkdtemp(join(tmpdir(), 'hypertext-smoke-test-'));
  const report = join(root, 'smoke.tsv');
  const curlLog = join(root, 'curl.log');
  await writeFile(curlLog, '');

  const result = spawnSync('bash', ['scripts/smoke.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      BASE_URL: 'https://example.test',
      FAKE_BAD_BODY_FRAGMENT: options.badBodyFragment ?? '',
      FAKE_BASE_URL: 'https://example.test',
      FAKE_CURL_LOG: curlLog,
      FAKE_FAIL_FRAGMENT: options.failFragment ?? '',
      FAKE_TRANSIENT_FRAGMENT: options.transientFragment ?? '',
      FAKE_WWW_URL: 'https://www.example.test',
      PATH: `${FAKE_BIN}${delimiter}${process.env.PATH}`,
      SMOKE_ATTEMPTS: '3',
      SMOKE_REPORT_FILE: report,
      SMOKE_RETRY_DELAY_SECONDS: '0',
      WWW_URL: 'https://www.example.test',
    },
  });
  return {
    calls: (await readFile(curlLog, 'utf8')).trim().split('\n').filter(Boolean),
    report: await readFile(report, 'utf8'),
    result,
  };
}

describe('production smoke report', () => {
  test('records all eight successful semantic checks', async () => {
    const { report, result } = await runSmoke();
    const rows = report.trim().split('\n');

    expect(result.status).toBe(0);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toBe('label\texpected\tactual\turl\tresult');
    expect(rows.slice(1).every((row) => row.endsWith('\tsuccess'))).toBe(true);
    expect(rows.find((row) => row.startsWith('Poem API\t'))).toContain(
      '200 application/json with a string poem',
    );
  });

  test('continues after a failed endpoint and returns a failing exit status', async () => {
    const { report, result } = await runSmoke({ failFragment: '/api/poem' });
    const rows = report.trim().split('\n');

    expect(result.status).toBe(1);
    expect(rows).toHaveLength(9);
    expect(rows.find((row) => row.startsWith('Poem API\t'))).toContain('\t500 ');
    expect(rows.at(-1)).toContain('\tsuccess');
  });

  test('rejects a 200 response containing the wrong payload', async () => {
    const { report, result } = await runSmoke({ badBodyFragment: '/oembed?' });

    expect(result.status).toBe(1);
    expect(report).toContain('oEmbed\t200 application/json with canonical provider metadata');
    expect(report).toContain('semantic mismatch');
  });

  test('retries a temporarily unavailable endpoint before recording success', async () => {
    const { calls, report, result } = await runSmoke({ transientFragment: '/micropub?' });

    expect(result.status).toBe(0);
    expect(calls.filter((url) => url.includes('/micropub?'))).toHaveLength(2);
    expect(report).toContain('Micropub config');
    expect(report).toContain('\tsuccess');
  });
});
