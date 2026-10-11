import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_ACCOUNT_ID = '2500680a3b2b0fe6a011c1c25fed5008';
const REPOSITORY = 'TheHypertextStudio/website';
const OUTPUT = '.hypertext/acceptance/cloudflare-recovery-inventory.json';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 5000;
const MAX_PAGES = 20;
const MAX_ZONES = 100;

// Only errors created here are safe to print. Never print fetch errors, provider
// messages, response bodies, headers, or the process environment.
class InventoryError extends Error {}
const fail = (message) => {
  throw new InventoryError(message);
};
const validId = (value) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

function text(value, label, limit = 1024) {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > limit ||
    [...value].some(
      (character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
    )
  )
    fail(`Invalid ${label} metadata.`);
  return value;
}

function validateContext(env) {
  if (env.CLOUDFLARE_ACCOUNT_ID !== EXPECTED_ACCOUNT_ID)
    fail('Configured Cloudflare account does not match the expected Studio account.');
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REPOSITORY !== REPOSITORY)
    fail('Inventory requires an explicit workflow dispatch in the Studio website repository.');
  if (!/^refs\/heads\/.+/.test(text(env.GITHUB_REF, 'source ref', 512)))
    fail('Inventory requires a repository branch ref.');
  if (
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') ||
    !/^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]{0,5}$/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    fail('Invalid hosted run provenance.');
  const token = text(env.CLOUDFLARE_API_TOKEN, 'Cloudflare API token', 4096);
  if (/\s/u.test(token)) fail('Invalid Cloudflare API token configuration.');
  return token;
}

async function readJson(response, label) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES)
    fail(`${label} response exceeds the byte limit.`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.byteLength;
    if (size > MAX_BYTES) fail(`${label} response exceeds the byte limit.`);
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail(`${label} response is not valid JSON.`);
  }
}

function list(body, label) {
  if (!Array.isArray(body.result) || body.result.length > MAX_ITEMS)
    fail(`Invalid or excessive ${label} result count.`);
  return body.result;
}

function unique(items, label) {
  if (new Set(items.map(({ id }) => id)).size !== items.length)
    fail(`Duplicate ${label} identities; inventory may be incomplete.`);
  return items.sort((left, right) => left.id.localeCompare(right.id));
}

// These Workers list APIs document no pagination request parameters. Refuse a
// truncated envelope instead of inventing unsupported pagination or omitting IDs.
function completeList(body, label) {
  const items = list(body, label);
  const info = body.result_info;
  if (
    info &&
    ((info.page !== undefined && info.page !== 1) ||
      (info.total_pages !== undefined &&
        info.total_pages !== 1 &&
        !(info.total_pages === 0 && items.length === 0)) ||
      (info.total_count !== undefined && info.total_count !== items.length))
  )
    fail(`${label} inventory is incomplete; unsupported pagination metadata.`);
  return items;
}

export async function captureInventory({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const token = validateContext(env); // Must precede every provider request.
  const deadline = AbortSignal.timeout(180_000);
  let requests = 0;
  const request = async (path, label, query = {}) => {
    if (++requests > MAX_ZONES + MAX_PAGES + 2) fail('Inventory request limit exceeded.');
    const url = new URL(`https://api.cloudflare.com/client/v4${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.any([deadline, AbortSignal.timeout(15_000)]),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok)
        fail(
          `Cloudflare ${label} request failed (HTTP ${response.status}); check existing credential permissions.`,
        );
      const body = await readJson(response, label);
      if (body?.success !== true)
        fail(
          `Cloudflare ${label} API rejected the request; check existing credential permissions.`,
        );
      return body;
    } catch (error) {
      if (error instanceof InventoryError) throw error;
      fail(
        `Cloudflare ${label} request failed or timed out; no provider error details were logged.`,
      );
    }
  };

  const accountBody = await request(`/accounts/${EXPECTED_ACCOUNT_ID}`, 'account');
  if (accountBody.result?.id !== EXPECTED_ACCOUNT_ID)
    fail('Returned account identity does not match the Studio account.');
  const account = {
    id: EXPECTED_ACCOUNT_ID,
    name: text(accountBody.result.name, 'account name', 256),
  };
  const zones = [];
  let totalPages;
  let totalCount;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await request('/zones', 'zones', {
      'account.id': EXPECTED_ACCOUNT_ID,
      per_page: 50,
      page,
    });
    const info = body.result_info;
    if (
      !info ||
      info.page !== page ||
      !Number.isInteger(info.total_pages) ||
      info.total_pages < 0 ||
      info.total_pages > MAX_PAGES ||
      (info.total_pages === 0 && body.result?.length !== 0) ||
      (info.total_pages > 0 && info.total_pages < page)
    )
      fail('Invalid or excessive zones pagination.');
    if (
      totalPages !== undefined &&
      (totalPages !== info.total_pages || totalCount !== info.total_count)
    )
      fail('Zones pagination changed during capture; retry the inventory.');
    totalPages = info.total_pages;
    totalCount = info.total_count;
    for (const item of list(body, 'zones')) {
      if (item?.account?.id !== EXPECTED_ACCOUNT_ID)
        fail('Returned zone account does not match the Studio account.');
      if (!validId(item.id)) fail('Invalid zone ID metadata.');
      zones.push({
        id: item.id,
        name: text(item.name, 'zone name', 253),
        status: text(item.status, 'zone status', 64),
      });
      if (zones.length > MAX_ZONES) fail('Zone count exceeds inventory limit.');
    }
    if (page >= totalPages) break;
  }
  if (totalCount !== undefined && (!Number.isInteger(totalCount) || totalCount !== zones.length))
    fail('Zones result count is incomplete.');
  unique(zones, 'zone');
  for (const zone of zones) {
    const body = await request(`/zones/${zone.id}/workers/routes`, 'Workers routes');
    zone.routes = unique(
      completeList(body, 'Workers routes').map((route) => ({
        id: text(route?.id, 'route ID', 128),
        pattern: text(route.pattern, 'route pattern', 2048),
        script: route.script == null ? null : text(route.script, 'route script', 256),
      })),
      'route',
    );
  }
  const domainBody = await request(
    `/accounts/${EXPECTED_ACCOUNT_ID}/workers/domains`,
    'Worker domains',
  );
  const workerDomains = unique(
    completeList(domainBody, 'Worker domains').map((domain) => {
      const item = {
        id: text(domain?.id, 'domain ID', 128),
        hostname: text(domain.hostname, 'domain hostname', 253),
        service: text(domain.service, 'domain service', 256),
        environment: text(domain.environment, 'domain environment', 256),
      };
      if (domain.zone_id != null) {
        if (!validId(domain.zone_id)) fail('Invalid domain zone ID metadata.');
        item.zone_id = domain.zone_id;
      }
      if (domain.zone_name != null)
        item.zone_name = text(domain.zone_name, 'domain zone name', 253);
      return item;
    }),
    'domain',
  );
  return {
    schema_version: 1,
    provenance: {
      repository: REPOSITORY,
      source_sha: env.GITHUB_SHA,
      source_ref: env.GITHUB_REF,
      run_id: env.GITHUB_RUN_ID,
      run_attempt: env.GITHUB_RUN_ATTEMPT,
      run_url: `https://github.com/${REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`,
      captured_at: now().toISOString(),
    },
    account,
    zones,
    worker_domains: workerDomains,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const inventory = await captureInventory();
    const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
    if (Buffer.byteLength(serialized) > 4 * MAX_BYTES)
      fail('Inventory artifact exceeds the byte limit.');
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, serialized, { flag: 'wx', mode: 0o600 });
    process.stdout.write('Read-only Cloudflare inventory captured successfully.\n');
  } catch (error) {
    console.error(
      error instanceof InventoryError
        ? error.message
        : 'Inventory capture or artifact write failed; no provider details were logged.',
    );
    process.exitCode = 1;
  }
}
