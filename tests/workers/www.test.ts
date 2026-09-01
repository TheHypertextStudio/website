import { exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';

test('redirects every www request to the canonical origin', async () => {
  const response = await exports.default.fetch('https://www.hypertext.studio/about?source=www', {
    redirect: 'manual',
  });
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe('https://hypertext.studio/about?source=www');
});
