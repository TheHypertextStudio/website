import { afterEach, describe, expect, test, vi } from 'vitest';

import micropubWorker from '../../workers/micropub/index';

const env = {
  GITHUB_TOKEN: 'github-token',
  INDIEAUTH_ENDPOINT: 'https://tokens.example.test/token',
  GITHUB_REPO: 'ExampleOrg/example-site',
  NOTES_PATH: 'src/content/notes',
  DEFAULT_BRANCH: 'main',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function createRequest(slug: string): Request {
  return new Request('https://hypertext.studio/micropub', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer indieauth-token',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      h: 'entry',
      content: 'A note from Micropub.',
      'mp-slug': slug,
    }),
  });
}

describe('Micropub publishing worker', () => {
  test('rejects an IndieAuth token that lacks create scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        me: 'https://hypertext.studio/',
        scope: 'update',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await micropubWorker.fetch(createRequest('safe-note'), env);

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test.each(['../../../package.json', '../outside', 'nested/note', '.', '..'])(
    'rejects unsafe mp-slug %j without calling GitHub',
    async (slug) => {
      const fetchMock = vi.fn().mockResolvedValue(
        Response.json({
          me: 'https://hypertext.studio/',
          scope: 'create',
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = await micropubWorker.fetch(createRequest(slug), env);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  test('rejects a request body larger than 64 KiB before publishing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ me: 'https://hypertext.studio/', scope: 'create' }));
    vi.stubGlobal('fetch', fetchMock);
    const oversized = new Request('https://hypertext.studio/micropub', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer indieauth-token',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ h: 'entry', content: 'x'.repeat(65_537) }),
    });

    const response = await micropubWorker.fetch(oversized, env);

    expect(response.status).toBe(413);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('stores escaped user content as Markdown rather than executable MDX', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ me: 'https://hypertext.studio/', scope: 'create' }))
      .mockResolvedValueOnce(Response.json({ commit: { sha: 'abc123' } }));
    vi.stubGlobal('fetch', fetchMock);
    const publishingRequest = new Request('https://hypertext.studio/micropub', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer indieauth-token',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        h: 'entry',
        content: '<script>alert(1)</script>',
        'mp-slug': 'safe-note',
      }),
    });

    const response = await micropubWorker.fetch(publishingRequest, env);

    expect(response.status).toBe(202);
    const githubUrl = String(fetchMock.mock.calls[1]?.[0]);
    const githubInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(githubInit.body)) as { content: string };
    expect(new URL(githubUrl).pathname).toMatch(/\/src\/content\/notes\/safe-note\.md$/);
    expect(atob(payload.content)).toContain('&lt;script>alert(1)&lt;/script>');
  });
});
