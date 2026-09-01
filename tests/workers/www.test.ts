import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';

test('redirects every www request to the canonical origin', async () => {
  const response = await SELF.fetch('https://www.hypertext.studio/about?source=www', {
    redirect: 'manual',
  });
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe('https://hypertext.studio/about?source=www');
});
