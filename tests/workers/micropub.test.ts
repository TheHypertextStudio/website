import { exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';

test('serves Micropub capability discovery in the Workers runtime', async () => {
  const response = await exports.default.fetch('https://hypertext.studio/micropub?q=config');
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    'media-endpoint': null,
    'syndicate-to': [],
  });
});
