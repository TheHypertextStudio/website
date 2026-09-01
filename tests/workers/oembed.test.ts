import { exports } from 'cloudflare:workers';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

test('returns page-specific oEmbed metadata in the Workers runtime', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    expect(request.url).toBe('https://hypertext.studio/about/');
    return new Response(
      '<html><head><title>Willie & Hypertext</title><meta name="description" content="A software studio."></head></html>',
      { headers: { 'content-type': 'text/html' } },
    );
  });

  const response = await exports.default.fetch(
    'https://hypertext.studio/oembed?url=https%3A%2F%2Fhypertext.studio%2Fabout%2F',
  );
  expect(response.status).toBe(200);
  const payload = await response.json<{
    html: string;
    provider_name: string;
    provider_url: string;
    title: string;
    type: string;
    version: string;
  }>();
  expect(payload).toMatchObject({
    provider_name: 'Hypertext Studio',
    provider_url: 'https://hypertext.studio',
    title: 'Willie & Hypertext',
    type: 'rich',
    version: '1.0',
  });
  expect(payload.html).toContain('Willie &amp; Hypertext');
  expect(payload.html).toContain('A software studio.');
});

test('requires a target URL in the Workers runtime', async () => {
  const response = await exports.default.fetch('https://hypertext.studio/oembed');
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: 'missing url parameter' });
});
