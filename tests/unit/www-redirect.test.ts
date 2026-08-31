import { describe, expect, it } from 'vitest';
import worker from '../../workers/www/index';

describe('www redirect worker', () => {
  it('redirects every path and query to the canonical apex over HTTPS', async () => {
    const response = await worker.fetch(
      new Request('https://www.hypertext.studio/studies/example?from=www'),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://hypertext.studio/studies/example?from=www',
    );
  });
});
