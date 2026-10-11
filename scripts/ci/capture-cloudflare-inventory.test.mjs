import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { captureInventory, EXPECTED_ACCOUNT_ID } from './capture-cloudflare-inventory.mjs';

const zoneId = '11111111111111111111111111111111';
const otherZoneId = '22222222222222222222222222222222';
const token = 'synthetic-test-token';
const env = {
  CLOUDFLARE_ACCOUNT_ID: '2500680a3b2b0fe6a011c1c25fed5008',
  CLOUDFLARE_API_TOKEN: token,
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_REPOSITORY: 'TheHypertextStudio/website',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '1234',
  GITHUB_RUN_ATTEMPT: '2',
};
const now = () => new Date('2026-10-10T12:00:00.000Z');
const ok = (result, result_info) => ({ success: true, result, result_info });
const zone = (id = zoneId) => ({
  id,
  name: `${id[0]}.example.com`,
  status: 'active',
  account: { id: env.CLOUDFLARE_ACCOUNT_ID },
  verification_key: token,
});

function mockApi(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: new URL(url), options });
    const path = new URL(url).pathname.replace('/client/v4', '');
    let body;
    if (Object.hasOwn(overrides, path)) body = overrides[path];
    else if (path === `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`)
      body = ok({ id: env.CLOUDFLARE_ACCOUNT_ID, name: 'Hypertext Studio', secrets: token });
    else if (path === '/zones') body = ok([zone()], { page: 1, total_pages: 1, total_count: 1 });
    else if (path.endsWith('/workers/routes'))
      body = ok([
        { id: 'route-1', pattern: '*.example.com/*', script: 'website', extra: token },
        { id: 'route-2', pattern: 'excluded.example.com/*' },
      ]);
    else if (path.endsWith('/workers/domains'))
      body = ok([
        {
          id: 'domain-1',
          hostname: 'example.com',
          service: 'website',
          environment: 'production',
          zone_id: zoneId,
          zone_name: 'example.com',
          cert_id: token,
        },
      ]);
    else throw new Error(`Unexpected mock path ${path}`);
    if (typeof body === 'function') body = body(new URL(url));
    return body instanceof Response ? body : Response.json(body);
  };
  return { calls, fetchImpl };
}

test('captures only requested metadata with hosted provenance and GET requests', async () => {
  const api = mockApi();
  const inventory = await captureInventory({ env, now, fetchImpl: api.fetchImpl });
  assert.equal(EXPECTED_ACCOUNT_ID, env.CLOUDFLARE_ACCOUNT_ID);
  assert.deepEqual(inventory.account, { id: EXPECTED_ACCOUNT_ID, name: 'Hypertext Studio' });
  assert.deepEqual(inventory.zones[0].routes[1], {
    id: 'route-2',
    pattern: 'excluded.example.com/*',
    script: null,
  });
  assert.deepEqual(inventory.worker_domains[0], {
    id: 'domain-1',
    hostname: 'example.com',
    service: 'website',
    environment: 'production',
    zone_id: zoneId,
    zone_name: 'example.com',
  });
  assert.equal(inventory.provenance.source_sha, env.GITHUB_SHA);
  assert.equal(inventory.provenance.run_attempt, '2');
  assert.equal(inventory.provenance.captured_at, now().toISOString());
  assert.equal(JSON.stringify(inventory).includes(token), false);
  assert.equal(api.calls.length, 4);
  for (const { url, options } of api.calls) {
    assert.equal(url.origin, 'https://api.cloudflare.com');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(options.body, undefined);
    assert.ok(options.signal instanceof AbortSignal);
  }
  const zonesRequest = api.calls.find(({ url }) => url.pathname.endsWith('/zones')).url;
  assert.equal(zonesRequest.searchParams.get('account.id'), EXPECTED_ACCOUNT_ID);
  const withoutZone = mockApi({
    [`/accounts/${EXPECTED_ACCOUNT_ID}/workers/domains`]: ok([
      { id: 'domain-1', hostname: 'example.com', service: 'website', environment: 'production' },
    ]),
  });
  const optional = await captureInventory({ env, fetchImpl: withoutZone.fetchImpl });
  assert.equal(Object.hasOwn(optional.worker_domains[0], 'zone_id'), false);
  assert.equal(Object.hasOwn(optional.worker_domains[0], 'zone_name'), false);
});

test('rejects incorrect account and untrusted workflow context before any request', async () => {
  for (const replacement of [
    { CLOUDFLARE_ACCOUNT_ID: '0'.repeat(32) },
    { CLOUDFLARE_API_TOKEN: '' },
    { GITHUB_REF: 'refs/tags/unreviewed' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'someone/website' },
    { GITHUB_SHA: 'not-a-sha' },
  ]) {
    const api = mockApi();
    await assert.rejects(
      captureInventory({ env: { ...env, ...replacement }, fetchImpl: api.fetchImpl }),
    );
    assert.equal(api.calls.length, 0);
  }
});

test('rejects mismatched returned account before zones request', async () => {
  const api = mockApi({
    [`/accounts/${EXPECTED_ACCOUNT_ID}`]: ok({ id: '0'.repeat(32), name: 'Other' }),
  });
  await assert.rejects(captureInventory({ env, fetchImpl: api.fetchImpl }), /account identity/);
  assert.equal(api.calls.length, 1);
});

test('follows bounded zone pagination and rejects zones from another account', async () => {
  const api = mockApi({
    '/zones': (url) => {
      const page = Number(url.searchParams.get('page'));
      return ok([zone(page === 1 ? zoneId : otherZoneId)], {
        page,
        total_pages: 2,
        total_count: 2,
      });
    },
  });
  const inventory = await captureInventory({ env, fetchImpl: api.fetchImpl });
  assert.equal(inventory.zones.length, 2);
  assert.equal(api.calls.filter(({ url }) => url.pathname.endsWith('/zones')).length, 2);
  const wrong = mockApi({
    '/zones': ok([{ ...zone(), account: { id: '0'.repeat(32) } }], { page: 1, total_pages: 1 }),
  });
  await assert.rejects(captureInventory({ env, fetchImpl: wrong.fetchImpl }), /zone account/);
  assert.equal(wrong.calls.length, 2);
});

test('fails closed on duplicate, inconsistent, missing or excessive pagination', async () => {
  for (const body of [
    ok([zone()]),
    ok([zone()], { page: 2, total_pages: 2 }),
    ok([zone()], { page: 1, total_pages: 1000 }),
    ok([zone(), zone()], { page: 1, total_pages: 1 }),
    ok([zone()], { page: 1, total_pages: 1, total_count: 2 }),
  ]) {
    const api = mockApi({ '/zones': body });
    await assert.rejects(captureInventory({ env, fetchImpl: api.fetchImpl }));
  }
});

test('does not claim complete unpaginated domains or routes when API advertises more pages', async () => {
  for (const path of [
    `/zones/${zoneId}/workers/routes`,
    `/accounts/${EXPECTED_ACCOUNT_ID}/workers/domains`,
  ]) {
    const api = mockApi({ [path]: ok([], { page: 1, total_pages: 2, total_count: 1 }) });
    await assert.rejects(captureInventory({ env, fetchImpl: api.fetchImpl }), /incomplete/);
  }
});

test('permission, API and transport errors never echo provider messages or credentials', async () => {
  for (const body of [
    new Response(`Sensitive provider message ${token}`, { status: 403 }),
    Response.json({ success: false, errors: [{ code: 10000, message: token }] }),
    new Response(token),
  ]) {
    const api = mockApi({ [`/accounts/${EXPECTED_ACCOUNT_ID}`]: body });
    await assert.rejects(captureInventory({ env, fetchImpl: api.fetchImpl }), (error) => {
      assert.equal(String(error).includes(token), false);
      return true;
    });
  }
  await assert.rejects(
    captureInventory({
      env,
      fetchImpl: async () => {
        throw new Error(token);
      },
    }),
    /account request failed/,
  );
});

test('bounds response bytes and rejects path injection in zone IDs', async () => {
  const huge = mockApi({
    [`/accounts/${EXPECTED_ACCOUNT_ID}`]: new Response('x'.repeat(2 * 1024 * 1024 + 1)),
  });
  await assert.rejects(captureInventory({ env, fetchImpl: huge.fetchImpl }), /response exceeds/);
  const injected = mockApi({ '/zones': ok([zone('../tokens')], { page: 1, total_pages: 1 }) });
  await assert.rejects(captureInventory({ env, fetchImpl: injected.fetchImpl }), /zone ID/);
  assert.equal(injected.calls.length, 2);
});

test('workflow inventory is opt-in in the Studio repository, isolated from installs and retains one file', async () => {
  const yaml = await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(
    yaml,
    /cloudflare_recovery_inventory:\s+description:[\s\S]*?type: boolean\s+default: false/,
  );
  const job = yaml.split('  cloudflare_inventory:')[1]?.split('\n  quality:')[0];
  assert.ok(job);
  assert.match(job, /github.event_name == 'workflow_dispatch'/);
  assert.match(job, /inputs.cloudflare_recovery_inventory == true/);
  assert.match(job, /github.repository == 'TheHypertextStudio\/website'/);
  assert.match(job, /node-version: '24\.20\.0'/);
  assert.match(job, /retention-days: 90/);
  assert.match(job, /persist-credentials: false/);
  assert.doesNotMatch(
    job,
    /environment:|pnpm|npm install|run build|wrangler|uses: \.\/\.github\/actions\/setup/,
  );
  assert.match(job, /path: \.hypertext\/acceptance\/cloudflare-recovery-inventory\.json/);
  const mockCheck = job.indexOf(
    'run: node --test scripts/ci/capture-cloudflare-inventory.test.mjs',
  );
  assert.ok(mockCheck > 0);
  assert.ok(mockCheck < job.indexOf('CLOUDFLARE_API_TOKEN:'));
});
