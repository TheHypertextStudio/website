import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const FAKE_CURL = `#!/usr/bin/env bash
set -euo pipefail

headers_file=""
output_file=""
url=""
while (($#)); do
  case "$1" in
    --dump-header|--output|--write-out|--max-time)
      key="$1"
      value="$2"
      shift 2
      case "$key" in
        --dump-header) headers_file="$value" ;;
        --output) output_file="$value" ;;
      esac
      ;;
    --silent|--show-error|--head)
      shift
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done

printf '%s\n' "$url" >>"$FAKE_CURL_LOG"
attempt="$(grep -Fxc "$url" "$FAKE_CURL_LOG")"
status=200
content_type='text/html; charset=utf-8'
body='<h1>Hypertext Studio builds software for humans.</h1><hypertext-studio></hypertext-studio>'
location=''

case "$url" in
  "$FAKE_BASE_URL/about/")
    body='Willie Chalmers III started Hypertext Studio as a home for his apps.'
    ;;
  "$FAKE_BASE_URL/llms.txt")
    content_type='text/markdown; charset=utf-8'
    body='# Hypertext Studio'
    ;;
  "$FAKE_BASE_URL/api/poem")
    content_type='application/json'
    body='{"poem":""}'
    ;;
  "$FAKE_BASE_URL/micropub?q=config")
    content_type='application/json'
    body='{"media-endpoint":null,"syndicate-to":[],"post-types":[{"type":"note"},{"type":"bookmark"}]}'
    ;;
  "$FAKE_BASE_URL/oembed?url=$FAKE_BASE_URL%2F")
    content_type='application/json'
    body='{"version":"1.0","type":"rich","provider_name":"Hypertext Studio","provider_url":"'"$FAKE_BASE_URL"'"}'
    ;;
  "$FAKE_BASE_URL/webmentions")
    status=400
    content_type='application/json'
    body='{"error":"missing ?target="}'
    ;;
  "$FAKE_WWW_URL/about")
    status=308
    location="$FAKE_BASE_URL/about"
    body=''
    ;;
esac

if [[ -n "\${FAKE_TRANSIENT_FRAGMENT:-}" && "$url" == *"$FAKE_TRANSIENT_FRAGMENT"* && "$attempt" -eq 1 ]]; then
  status=503
  content_type='text/plain'
  body='not ready'
fi
if [[ -n "\${FAKE_FAIL_FRAGMENT:-}" && "$url" == *"$FAKE_FAIL_FRAGMENT"* ]]; then
  status=500
fi
if [[ -n "\${FAKE_BAD_BODY_FRAGMENT:-}" && "$url" == *"$FAKE_BAD_BODY_FRAGMENT"* ]]; then
  body='wrong service response'
fi

if [[ -n "$headers_file" ]]; then
  {
    printf 'HTTP/2 %s\r\n' "$status"
    printf 'content-type: %s\r\n' "$content_type"
    if [[ -n "$location" ]]; then printf 'location: %s\r\n' "$location"; fi
    printf '\r\n'
  } >"$headers_file"
fi
if [[ -n "$output_file" && "$output_file" != '/dev/null' ]]; then
  printf '%s' "$body" >"$output_file"
fi
printf '%s' "$status"
`;

interface SmokeOptions {
  readonly badBodyFragment?: string;
  readonly failFragment?: string;
  readonly transientFragment?: string;
}

async function runSmoke(options: SmokeOptions = {}) {
  const root = await mkdtemp(join(tmpdir(), 'hypertext-smoke-test-'));
  const fakeBin = join(root, 'bin');
  const report = join(root, 'smoke.tsv');
  const curlLog = join(root, 'curl.log');
  await mkdir(fakeBin);
  await writeFile(curlLog, '');
  const curl = join(fakeBin, 'curl');
  await writeFile(curl, FAKE_CURL);
  await chmod(curl, 0o755);

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
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
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
