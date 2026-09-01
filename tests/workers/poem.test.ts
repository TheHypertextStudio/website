import { exports } from 'cloudflare:workers';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

test('returns the configured studio line from DNS in the Workers runtime', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    expect(request.url).toBe('https://cloudflare-dns.com/dns-query?name=hypertext.studio&type=TXT');
    return Response.json({ Answer: [{ data: '"studio:Software for humans."' }] });
  });

  const response = await exports.default.fetch('https://hypertext.studio/api/poem');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/json');
  expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  await expect(response.json()).resolves.toEqual({ poem: 'Software for humans.' });
});

test('rejects paths outside the poem endpoint', async () => {
  const response = await exports.default.fetch('https://hypertext.studio/not-the-poem');
  expect(response.status).toBe(404);
});
