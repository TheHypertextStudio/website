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
});
