import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';

test('requires a target URL in the Workers runtime', async () => {
  const response = await SELF.fetch('https://hypertext.studio/oembed');
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: 'missing url parameter' });
});
