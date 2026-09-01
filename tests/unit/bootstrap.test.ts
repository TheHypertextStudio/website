import { chmod, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

import { afterEach, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const fixtureRoots: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    fixtureRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function executable(path: string, contents: string) {
  await writeFile(path, contents);
  await chmod(path, 0o755);
}

interface CheckoutOptions {
  readonly micropubTokenPresent?: boolean;
  readonly cloudflareCiTokenPresent?: boolean;
  readonly mentionTypePresent?: boolean;
}

async function makeCheckout({
  micropubTokenPresent = true,
  cloudflareCiTokenPresent = true,
  mentionTypePresent = true,
}: CheckoutOptions = {}) {
  const root = await import('node:fs/promises').then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), 'hypertext-bootstrap-')),
  );
  fixtureRoots.push(root);

  await mkdir(join(root, 'scripts/lib'), { recursive: true });
  await mkdir(join(root, 'workers/shared'), { recursive: true });
  await mkdir(join(root, 'migrations'), { recursive: true });
  await mkdir(join(root, 'fake-bin'), { recursive: true });
  await cp('scripts/bootstrap.sh', join(root, 'scripts/bootstrap.sh'));
  await cp('scripts/migrate-d1.sh', join(root, 'scripts/migrate-d1.sh'));
  await cp('scripts/lib/log.sh', join(root, 'scripts/lib/log.sh'));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify(
      {
        packageManager: 'pnpm@10.33.3',
        homepage: 'https://example.test',
        repository: {
          type: 'git',
          url: 'git@github.com:PackageFallback/package-fallback.git',
        },
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    join(root, '.env.example'),
    [
      'SITE_URL=https://example.test',
      'CLOUDFLARE_PAGES_PROJECT=example-pages',
      'GITHUB_REPO=EnvFallback/env-fallback',
      '',
    ].join('\n'),
  );
  await writeFile(join(root, 'migrations/0001_create_webmentions.sql'), 'SELECT 1;\n');
  await writeFile(
    join(root, 'wrangler.toml'),
    [
      'name = "wrangler-fallback"',
      'account_id = "REPLACE_WITH_REAL_ACCOUNT_ID"',
      '',
      '[env.webmention]',
      'name = "hypertext-studio-webmention"',
      '',
      '[[env.webmention.d1_databases]]',
      'binding = "DB"',
      'database_name = "example-database"',
      'database_id = "REPLACE_WITH_REAL_D1_ID"',
      '',
      '[env.micropub]',
      'name = "hypertext-studio-micropub"',
      '',
    ].join('\n'),
  );

  const callLog = join(root, 'calls.log');
  const actionSecret = join(root, 'action-secret.txt');

  await executable(
    join(root, 'fake-bin/corepack'),
    '#!/usr/bin/env bash\n[[ "${1:-}" == "-v" ]] && printf "0.32.0\\n"\n',
  );
  await executable(
    join(root, 'fake-bin/git'),
    [
      '#!/usr/bin/env bash',
      'if [[ "${1:-}" == "--version" ]]; then printf "git version 2.50.0\\n"; exit 0; fi',
      'if [[ "$*" == "config --get remote.origin.url" ]]; then printf "git@github.com:ExampleOrg/example-site.git\\n"; exit 0; fi',
      'exit 0',
      '',
    ].join('\n'),
  );
  await executable(
    join(root, 'fake-bin/pnpm'),
    [
      '#!/usr/bin/env bash',
      'if [[ "${1:-}" == "--version" ]]; then printf "10.33.3\\n"; exit 0; fi',
      'printf "pnpm %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
      'if [[ "${1:-}" == "exec" && "${2:-}" == "astro" ]]; then printf "astro 7.2.7\\n"; exit 0; fi',
      'if [[ "${1:-}" == "exec" && "${2:-}" == "wrangler" ]]; then shift 2; exec wrangler "$@"; fi',
      'exit 0',
      '',
    ].join('\n'),
  );
  await executable(
    join(root, 'fake-bin/wrangler'),
    [
      '#!/usr/bin/env bash',
      'printf "wrangler %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
      'case "$*" in',
      '  "--version") printf "4.126.0\\n" ;;',
      '  "auth activate hypertext-studio "*) ;;',
      '  "whoami --json") printf \'%s\\n\' \'{"loggedIn":true,"accounts":[{"id":"account-123","name":"Hypertext Studio"}]}\' ;;',
      '  "d1 list --json --profile hypertext-studio") printf \'%s\\n\' \'[{"uuid":"d1-456","name":"example-database"}]\' ;;',
      `  "d1 execute example-database --env webmention --remote --command PRAGMA table_info(webmentions) --json --yes --profile hypertext-studio") printf '%s\\n' '${JSON.stringify(
        [
          {
            results: mentionTypePresent
              ? [{ name: 'id' }, { name: 'mention_type' }]
              : [{ name: 'id' }],
            success: true,
          },
        ],
      )}' ;;`,
      '  "pages project list --json --profile hypertext-studio") printf \'[]\\n\' ;;',
      `  "secret list --env micropub --format json --profile hypertext-studio") printf '%s\\n' '${
        micropubTokenPresent ? '[{"name":"GITHUB_TOKEN"}]' : '[]'
      }' ;;`,
      '  "auth token --json --profile hypertext-studio") printf \'%s\\n\' \'{"type":"oauth","token":"oauth-test-token"}\' ;;',
      '  "auth token --profile hypertext-studio") printf \'Active profile: hypertext-studio\\nAuthentication: OAuth\\noauth-test-token\\n\' ;;',
      'esac',
      '',
    ].join('\n'),
  );
  await executable(
    join(root, 'fake-bin/gh'),
    [
      '#!/usr/bin/env bash',
      'printf "gh %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
      'case "$*" in',
      '  "--version") printf "gh version 2.80.0\\n" ;;',
      '  "auth status") ;;',
      '  "repo view ExampleOrg/example-site") ;;',
      `  "secret list --repo ExampleOrg/example-site --app actions --json name") printf '%s\\n' '${
        cloudflareCiTokenPresent
          ? '[{"name":"CLOUDFLARE_ACCOUNT_ID"},{"name":"CLOUDFLARE_API_TOKEN"}]'
          : '[{"name":"CLOUDFLARE_ACCOUNT_ID"}]'
      }' ;;`,
      '  "secret set CLOUDFLARE_ACCOUNT_ID --repo ExampleOrg/example-site --app actions") cat > "$BOOTSTRAP_ACTION_SECRET" ;;',
      'esac',
      '',
    ].join('\n'),
  );
  await executable(
    join(root, 'fake-bin/curl'),
    [
      '#!/usr/bin/env bash',
      'printf "curl %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
      'config=""',
      'for ((index = 1; index <= $#; index++)); do',
      '  if [[ "${!index}" == "--config" ]]; then',
      '    next=$((index + 1))',
      '    config="${!next}"',
      '  fi',
      'done',
      'grep -qx \'header = "Authorization: Bearer oauth-test-token"\' "$config" || exit 26',
      'if [[ "$*" == *"--request POST"* ]]; then',
      '  printf \'%s\\n\' \'{"success":true,"result":{"name":"configured.example","status":"pending"}}\'',
      'else',
      '  printf \'%s\\n\' \'{"success":true,"result":[]}\'',
      'fi',
      '',
    ].join('\n'),
  );

  return { root, callLog, actionSecret };
}

describe('bootstrap', { timeout: 15_000 }, () => {
  test('persists discovered Cloudflare values and provisions every non-secret resource', async () => {
    const { root, callLog, actionSecret } = await makeCheckout();

    await execFileAsync('bash', ['scripts/bootstrap.sh'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    const config = await readFile(join(root, 'wrangler.toml'), 'utf8');
    expect(config).toContain('account_id = "account-123"');
    expect(config).toContain('database_id = "d1-456"');

    const calls = await readFile(callLog, 'utf8');
    expect(calls).toContain(
      'wrangler pages project create example-pages --production-branch main --profile hypertext-studio',
    );
    expect(calls).toContain(
      'wrangler d1 migrations apply example-database --env webmention --remote --profile hypertext-studio',
    );
    expect(calls).toContain('/pages/projects/example-pages/domains');
    expect(calls).toContain('example.test');
    expect(calls).toContain('www.example.test');
    expect(calls).toContain('gh repo view ExampleOrg/example-site');
    expect(await readFile(actionSecret, 'utf8')).toBe('account-123');
    expect(calls).not.toContain('oauth-test-token');

    // Chromium backs `make ci` / `make test-artifact`.
    expect(calls).toContain(
      process.platform === 'linux'
        ? 'pnpm exec playwright install --with-deps chromium'
        : 'pnpm exec playwright install chromium',
    );
  });

  test('finishes bootstrap and records the gap when the browser install fails', async () => {
    const { root, callLog, actionSecret } = await makeCheckout();
    // A rootless container has no usable sudo, so `playwright install --with-deps`
    // fails. Bootstrap must warn and carry on rather than abort under `set -e`.
    await executable(
      join(root, 'fake-bin/pnpm'),
      [
        '#!/usr/bin/env bash',
        'if [[ "${1:-}" == "--version" ]]; then printf "10.33.3\\n"; exit 0; fi',
        'printf "pnpm %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
        'if [[ "$*" == *"playwright install"* ]]; then exit 1; fi',
        'if [[ "${1:-}" == "exec" && "${2:-}" == "astro" ]]; then printf "astro 7.2.7\\n"; exit 0; fi',
        'if [[ "${1:-}" == "exec" && "${2:-}" == "wrangler" ]]; then shift 2; exec wrangler "$@"; fi',
        'exit 0',
        '',
      ].join('\n'),
    );

    // Throws on a non-zero exit, so reaching the assertions proves it survived.
    const { stdout } = await execFileAsync('bash', ['scripts/bootstrap.sh'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    expect(stdout).toContain('Chromium not installed');
    expect(stdout).toContain('browser:            not installed');
    // Phases after the browser install still ran.
    expect(await readFile(join(root, '.env'), 'utf8')).toContain('=');
  });

  test('removes the temporary Cloudflare credential file when domain provisioning fails', async () => {
    const { root, callLog, actionSecret } = await makeCheckout();
    const temp = join(root, 'tmp');
    await mkdir(temp);
    await executable(
      join(root, 'fake-bin/curl'),
      [
        '#!/usr/bin/env bash',
        'printf "curl %s\\n" "$*" >> "$BOOTSTRAP_CALL_LOG"',
        'printf "Cloudflare unavailable\\n" >&2',
        'exit 22',
        '',
      ].join('\n'),
    );

    await expect(
      execFileAsync('bash', ['scripts/bootstrap.sh'], {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
          BOOTSTRAP_CALL_LOG: callLog,
          BOOTSTRAP_ACTION_SECRET: actionSecret,
          GITHUB_REPOSITORY: '',
          TMPDIR: temp,
          NO_COLOR: '1',
        },
      }),
    ).rejects.toMatchObject({ code: 22 });

    expect(await readdir(temp)).toEqual([]);
  });

  test('does not print the Cloudflare OAuth bearer in verbose mode', async () => {
    const { root, callLog, actionSecret } = await makeCheckout();

    const { stdout, stderr } = await execFileAsync('bash', ['scripts/bootstrap.sh', '--verbose'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    expect(`${stdout}\n${stderr}`).not.toContain('oauth-test-token');
  });

  test('upgrades an existing webmentions table before applying the schema', async () => {
    const { root, callLog, actionSecret } = await makeCheckout({ mentionTypePresent: false });

    await execFileAsync('bash', ['scripts/bootstrap.sh'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    const calls = await readFile(callLog, 'utf8');
    expect(calls).toContain(
      "wrangler d1 execute example-database --env webmention --remote --command ALTER TABLE webmentions ADD COLUMN mention_type TEXT NOT NULL DEFAULT 'mention' --yes --profile hypertext-studio",
    );
    expect(calls.indexOf('ALTER TABLE webmentions')).toBeLessThan(
      calls.indexOf('d1 migrations apply example-database'),
    );
  });

  test('walks the operator through creating the least-privilege Micropub token', async () => {
    const { root, callLog, actionSecret } = await makeCheckout({
      micropubTokenPresent: false,
    });

    const { stdout } = await execFileAsync('bash', ['scripts/bootstrap.sh'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    expect(stdout).toContain('Create the Micropub publishing token before continuing:');
    expect(stdout).toContain('https://github.com/settings/personal-access-tokens/new');
    expect(stdout).toContain('Resource owner: ExampleOrg');
    expect(stdout).toContain('Repository access: Only select repositories → example-site');
    expect(stdout).toContain('Repository permissions → Contents: Read and write');
    expect(stdout).toContain('Wrangler stores it as the micropub Worker secret GITHUB_TOKEN');
    expect(stdout).toContain('Generate token, then paste it at the masked prompt below.');
  });

  test('walks the operator through creating the scoped Cloudflare deployment token', async () => {
    const { root, callLog, actionSecret } = await makeCheckout({
      cloudflareCiTokenPresent: false,
    });

    const { stdout } = await execFileAsync('bash', ['scripts/bootstrap.sh'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'fake-bin')}:${process.env.PATH}`,
        BOOTSTRAP_CALL_LOG: callLog,
        BOOTSTRAP_ACTION_SECRET: actionSecret,
        GITHUB_REPOSITORY: '',
        NO_COLOR: '1',
      },
    });

    expect(stdout).toContain('Create the Cloudflare deployment token before continuing:');
    expect(stdout).toContain('https://dash.cloudflare.com/profile/api-tokens');
    expect(stdout).toContain('Account → Cloudflare Pages: Edit');
    expect(stdout).toContain('Account → Workers Scripts: Edit');
    expect(stdout).toContain('Account → D1: Edit');
    expect(stdout).toContain('Zone → Workers Routes: Edit');
    expect(stdout).toContain('Account resources: Include → Hypertext Studio');
    expect(stdout).toContain('Zone resources: Include → Specific zone → example.test');
    expect(stdout).toContain('GitHub stores it as the Actions secret CLOUDFLARE_API_TOKEN');
  });
});
