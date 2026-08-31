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

function harness() {
  const queries: QueryRecord[] = [];
  const database = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
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
    expect(finalUpdate?.sql).toContain("status = 'rejected'");
  });
});
