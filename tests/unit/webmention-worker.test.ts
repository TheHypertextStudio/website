import { afterEach, describe, expect, test, vi } from 'vitest';

import webmentionWorker from '../../workers/webmention/index';

interface QueryRecord {
  readonly sql: string;
  readonly params: readonly unknown[];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function request(): Request {
  return new Request('https://hypertext.studio/webmention', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      source: 'https://source.example/post',
      target: 'https://hypertext.studio/studies/example',
    }),
  });
}

function harness({ duplicate = false }: { duplicate?: false | 'recent' | 'stale' } = {}) {
  const queries: QueryRecord[] = [];
  const database = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              queries.push({ sql, params });
              if (sql.includes('RETURNING id')) {
                return duplicate === 'recent' ? null : { id: 1 };
              }
              return duplicate ? { status: 'pending' } : null;
            },
            async run() {
              queries.push({ sql, params });
              return { success: true };
            },
          };
        },
      };
    },
  };
  const background: Promise<unknown>[] = [];
  const context = {
    waitUntil(promise: Promise<unknown>) {
      background.push(promise);
    },
    passThroughOnException() {},
    props: {},
  };

  return { queries, background, env: { DB: database }, context };
}

type WorkerFetch = (
  request: Request,
  env: ReturnType<typeof harness>['env'],
  context: ReturnType<typeof harness>['context'],
) => Promise<Response>;

describe('Webmention receiving worker', () => {
  test('registers verification with the Worker execution context', async () => {
    const target = 'https://hypertext.studio/studies/example';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(`<a href="${target}">Referenced post</a>`, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      ),
    );
    const { queries, background, env, context } = harness();

    const response = await (webmentionWorker.fetch as unknown as WorkerFetch)(
      request(),
      env,
      context,
    );

    expect(response.status).toBe(202);
    expect(background).toHaveLength(1);
    await Promise.all(background);
    expect(queries.some(({ sql }) => sql.includes("status = 'verified'"))).toBe(true);
  });

  test('rejects a source response larger than the verification limit', async () => {
    const target = 'https://hypertext.studio/studies/example';
    const oversizedHtml = `<a href="${target}">Referenced post</a>${'x'.repeat(1_048_576)}`;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(oversizedHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      ),
    );
    const { queries, background, env, context } = harness();

    await (webmentionWorker.fetch as unknown as WorkerFetch)(request(), env, context);
    if (background.length > 0) {
      await Promise.all(background);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const finalUpdate = queries.at(-1);
    expect(finalUpdate?.sql).toContain('DELETE FROM webmentions');
  });

  test('rejects a nonexistent target before creating a database row', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })));
    const { queries, env, context } = harness();

    const response = await (webmentionWorker.fetch as unknown as WorkerFetch)(
      request(),
      env,
      context,
    );

    expect(response.status).toBe(400);
    expect(queries).toHaveLength(0);
  });

  test('rejects an oversized submission before target validation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const oversizedRequest = new Request('https://hypertext.studio/webmention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        source: 'https://source.example/post',
        target: `https://hypertext.studio/${'x'.repeat(9_000)}`,
      }),
    });
    const { env, context } = harness();

    const response = await (webmentionWorker.fetch as unknown as WorkerFetch)(
      oversizedRequest,
      env,
      context,
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('deduplicates a recent pending source-target pair', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('target exists', { status: 200 })),
    );
    const { queries, background, env, context } = harness({ duplicate: 'recent' });

    const response = await (webmentionWorker.fetch as unknown as WorkerFetch)(
      request(),
      env,
      context,
    );

    expect(response.status).toBe(202);
    expect(background).toHaveLength(0);
    expect(
      queries.some(
        ({ sql }) =>
          sql.includes('ON CONFLICT (source, target)') &&
          sql.includes("WHERE webmentions.received_at < datetime('now', '-1 hour')"),
      ),
    ).toBe(true);
  });

  test('requeues a stale source-target pair without violating the unique constraint', async () => {
    const target = 'https://hypertext.studio/studies/example';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('target exists', { status: 200 }))
        .mockResolvedValueOnce(
          new Response('<a href="' + target + '">Referenced post</a>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }),
        ),
    );
    const { queries, background, env, context } = harness({ duplicate: 'stale' });

    const response = await (webmentionWorker.fetch as unknown as WorkerFetch)(
      request(),
      env,
      context,
    );

    expect(response.status).toBe(202);
    expect(background).toHaveLength(1);
    await Promise.all(background);
    expect(
      queries.some(
        ({ sql }) =>
          sql.includes('ON CONFLICT (source, target)') && sql.includes("status = 'pending'"),
      ),
    ).toBe(true);
  });
});
