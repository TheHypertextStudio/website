import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';

test('rejects paths outside the poem endpoint', async () => {
  const response = await SELF.fetch('https://hypertext.studio/not-the-poem');
  expect(response.status).toBe(404);
});
