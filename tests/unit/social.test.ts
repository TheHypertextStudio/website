import { describe, expect, test } from 'vitest';

import { blueskyProfileUrl, filterSyndicationUrls, resolveSocialLinks } from '../../src/lib/social';

describe('blueskyProfileUrl', () => {
  test('returns no public profile when the build has no configured handle', () => {
    expect(blueskyProfileUrl(undefined)).toBeUndefined();
    expect(blueskyProfileUrl('   ')).toBeUndefined();
  });

  test('derives the public profile from a configured handle', () => {
    expect(blueskyProfileUrl('hypertext.studio')).toBe('https://bsky.app/profile/hypertext.studio');
    expect(blueskyProfileUrl('@hypertext.studio')).toBe(
      'https://bsky.app/profile/hypertext.studio',
    );
  });
});

describe('resolveSocialLinks', () => {
  const links = [
    { label: 'GitHub', href: 'https://github.com/example', rel: 'me' },
    { label: 'Bluesky', network: 'bluesky' as const, rel: 'me' },
    { label: 'Fediverse', href: 'https://fed.brid.gy/example', rel: 'me' },
  ];

  test('omits an optional Bluesky link when no profile is configured', () => {
    expect(resolveSocialLinks(links, { bluesky: undefined })).toEqual([
      { label: 'GitHub', href: 'https://github.com/example', rel: 'me' },
      { label: 'Fediverse', href: 'https://fed.brid.gy/example', rel: 'me' },
    ]);
  });

  test('resolves an optional Bluesky link when a profile is configured', () => {
    expect(
      resolveSocialLinks(links, {
        bluesky: 'https://bsky.app/profile/hypertext.studio',
      }),
    ).toContainEqual({
      label: 'Bluesky',
      href: 'https://bsky.app/profile/hypertext.studio',
      rel: 'me',
    });
  });
});

describe('filterSyndicationUrls', () => {
  const urls = [
    'https://bsky.app/profile/hypertext.studio/post/example',
    'https://mastodon.social/@example/123',
  ];

  test('keeps Bluesky syndication private until a profile is configured', () => {
    expect(filterSyndicationUrls(urls, undefined)).toEqual([
      'https://mastodon.social/@example/123',
    ]);
  });

  test('retains Bluesky syndication when a profile is configured', () => {
    expect(filterSyndicationUrls(urls, 'https://bsky.app/profile/hypertext.studio')).toEqual(urls);
  });
});
