import { describe, expect, test } from 'vitest';
import {
  BodyTooLargeError,
  normalizeCanonicalIdentity,
  readLimitedBody,
} from '../../workers/shared/http';

describe('readLimitedBody', () => {
  test('rejects a declared body larger than the limit', async () => {
    const request = new Request('https://example.test', {
      method: 'POST',
      headers: { 'Content-Length': '9' },
      body: '123456789',
    });
    await expect(readLimitedBody(request, 8)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  test('rejects a streamed body that crosses the limit', async () => {
    const request = new Request('https://example.test', { method: 'POST', body: '123456789' });
    await expect(readLimitedBody(request, 8)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});

describe('normalizeCanonicalIdentity', () => {
  test('normalizes the canonical root URL', () => {
    expect(normalizeCanonicalIdentity('https://hypertext.studio')).toBe(
      'https://hypertext.studio/',
    );
  });

  test.each([
    'not a URL',
    'http://hypertext.studio/',
    'https://hypertext.studio/about',
    'https://hypertext.studio/?identity=other',
    'https://user:password@hypertext.studio/',
  ])('rejects a noncanonical identity %j', (value) => {
    expect(normalizeCanonicalIdentity(value)).toBeNull();
  });
});
