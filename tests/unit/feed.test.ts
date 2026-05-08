import { describe, expect, test } from 'vitest';
import {
  escapeXml,
  escapeCdata,
  noteSummary,
  noteTitle,
  rfc822,
  rfc3339,
  serializeAtom,
  serializeJsonFeed,
  serializeRss,
  tagUri,
  type FeedItem,
  type FeedMeta,
} from '@/lib/feed';

const META: FeedMeta = {
  siteName: 'Hypertext Studio',
  siteUrl: 'https://hypertext.studio',
  description: 'A small design lab building sustainable, human-centered software.',
  feedUrl: 'https://hypertext.studio/feed.xml',
  language: 'en',
  buildDate: new Date('2026-04-12T00:00:00Z'),
};

const STUDY: FeedItem = {
  kind: 'study',
  id: 'curfew-launch',
  url: 'https://hypertext.studio/studies/curfew-launch',
  title: 'Curfew, the launch study',
  summary: 'A small piece of software that lets you revoke your own consent.',
  publishedAt: new Date('2026-04-08T00:00:00Z'),
  modifiedAt: new Date('2026-04-12T00:00:00Z'),
  tags: ['attention', 'consent'],
  syndicatedTo: ['https://bsky.app/profile/hypertext.studio/post/3kpcurfewlaunchexample'],
  inReplyTo: undefined,
  author: 'Hypertext Studio',
};

const NOTE_ATOM: FeedItem = {
  kind: 'note',
  id: '2026-04-08-on-finishing',
  url: 'https://hypertext.studio/notes/2026-04-08-on-finishing',
  title: 'Note · 2026-04-08',
  summary: 'Curfew shipped today. The launch study is up.',
  publishedAt: new Date('2026-04-08T18:00:00Z'),
  tags: ['notes', 'launch'],
  syndicatedTo: [],
  author: 'Hypertext Studio',
};
// In RSS, notes carry no <title>.
const NOTE_RSS: FeedItem = { ...NOTE_ATOM, title: null };

// ───────────────────────────────────────────────────────── pure helpers

describe('escapeXml', () => {
  test('escapes the five XML predefined entities', () => {
    expect(escapeXml(`Tom & Jerry < "ampersand" > 'quote'`)).toBe(
      'Tom &amp; Jerry &lt; &quot;ampersand&quot; &gt; &#39;quote&#39;',
    );
  });

  test('passes plain text through unchanged', () => {
    expect(escapeXml('Curfew, the launch study')).toBe('Curfew, the launch study');
  });
});

describe('escapeCdata', () => {
  test('splits ]]> across two CDATA sections', () => {
    expect(escapeCdata('a ]]> b')).toBe('a ]]]]><![CDATA[> b');
  });

  test('leaves benign content alone', () => {
    expect(escapeCdata('plain text')).toBe('plain text');
  });
});

describe('rfc822 / rfc3339', () => {
  test('rfc822 emits numeric timezone for RSS', () => {
    expect(rfc822(new Date('2026-04-08T00:00:00Z'))).toBe('Wed, 08 Apr 2026 00:00:00 +0000');
  });

  test('rfc3339 round-trips ISO strings', () => {
    expect(rfc3339(new Date('2026-04-08T18:00:00Z'))).toBe('2026-04-08T18:00:00.000Z');
  });
});

describe('tagUri', () => {
  test('produces RFC 4151 form with stable authority and year', () => {
    expect(tagUri('feed')).toBe('tag:hypertext.studio,2026:feed');
    expect(tagUri('study/curfew-launch')).toBe('tag:hypertext.studio,2026:study/curfew-launch');
  });
});

describe('noteSummary', () => {
  test('returns first paragraph as-is when short', () => {
    expect(noteSummary('Curfew shipped today.')).toBe('Curfew shipped today.');
  });

  test('collapses internal whitespace and newlines', () => {
    expect(noteSummary('one\n  two   three')).toBe('one two three');
  });

  test('takes only the first paragraph', () => {
    expect(noteSummary('First.\n\nSecond.')).toBe('First.');
  });

  test('truncates at word boundary with ellipsis', () => {
    const long = 'word '.repeat(60).trim(); // ~300 chars
    const out = noteSummary(long);
    expect(out.length).toBeLessThanOrEqual(201); // 200 + ellipsis
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  '); // no double spaces from the cut
  });

  test('handles empty input', () => {
    expect(noteSummary('')).toBe('');
    expect(noteSummary('   \n\n   ')).toBe('');
  });
});

describe('noteTitle', () => {
  test('uses Note label and ISO date', () => {
    expect(noteTitle(new Date('2026-04-08T18:00:00Z'))).toBe('Note · 2026-04-08');
  });
});

// ─────────────────────────────────────────────────────────── serializers

describe('serializeRss', () => {
  test('matches snapshot for one study + one note', () => {
    expect(serializeRss([STUDY, NOTE_RSS], META)).toMatchSnapshot();
  });

  test('omits <title> for notes (kind = note with title null)', () => {
    const xml = serializeRss([NOTE_RSS], META);
    // The <item> block must not contain a <title> element.
    const itemBlock = xml.slice(xml.indexOf('<item>'), xml.indexOf('</item>'));
    expect(itemBlock).not.toContain('<title>');
  });

  test('emits <title> for studies', () => {
    const xml = serializeRss([STUDY], META);
    expect(xml).toContain('<title>Curfew, the launch study</title>');
  });

  test('escapes ampersand in study title', () => {
    const item: FeedItem = { ...STUDY, title: 'Tom & Jerry' };
    const xml = serializeRss([item], META);
    expect(xml).toContain('<title>Tom &amp; Jerry</title>');
    expect(xml).not.toMatch(/<title>Tom & Jerry<\/title>/);
  });

  test('contains atom:link rel="self" inside the channel', () => {
    const xml = serializeRss([], META);
    expect(xml).toContain(
      '<atom:link href="https://hypertext.studio/feed.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  test('empty items still produces a well-formed channel with metadata', () => {
    const xml = serializeRss([], META);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('<title>Hypertext Studio</title>');
    expect(xml).toContain('<lastBuildDate>');
    expect(xml).toContain('</channel>');
    expect(xml).toContain('</rss>');
    expect(xml).not.toContain('<item>');
  });
});

describe('serializeAtom', () => {
  test('matches snapshot', () => {
    expect(serializeAtom([STUDY, NOTE_ATOM], META)).toMatchSnapshot();
  });

  test('every entry has a <title> (notes use the derived label)', () => {
    const xml = serializeAtom([STUDY, NOTE_ATOM], META);
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e).toMatch(/<title>[^<]+<\/title>/);
    }
  });

  test('uses stable tag URIs for feed and entry ids', () => {
    const xml = serializeAtom([STUDY], META);
    expect(xml).toContain('<id>tag:hypertext.studio,2026:feed</id>');
    expect(xml).toContain('<id>tag:hypertext.studio,2026:study/curfew-launch</id>');
  });

  test('emits thr:in-reply-to when present', () => {
    const item: FeedItem = { ...STUDY, inReplyTo: 'https://example.com/post' };
    const xml = serializeAtom([item], META);
    expect(xml).toContain('<thr:in-reply-to ref="https://example.com/post"/>');
  });

  test('emits one syndication link per syndicatedTo URL', () => {
    const xml = serializeAtom([STUDY], META);
    const synLinks = xml.match(/<link rel="syndication"/g)?.length ?? 0;
    expect(synLinks).toBe(STUDY.syndicatedTo.length);
  });

  test('empty feed is well-formed', () => {
    const xml = serializeAtom([], META);
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<id>tag:hypertext.studio,2026:feed</id>');
    expect(xml).toContain('</feed>');
    expect(xml).not.toContain('<entry>');
  });
});

describe('serializeJsonFeed', () => {
  test('parses as JSON Feed 1.1', () => {
    const json = JSON.parse(serializeJsonFeed([STUDY, NOTE_ATOM], META));
    expect(json.version).toBe('https://jsonfeed.org/version/1.1');
    expect(json.title).toBe('Hypertext Studio');
    expect(json.home_page_url).toBe('https://hypertext.studio');
    expect(json.feed_url).toBe('https://hypertext.studio/feed.xml');
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(2);
  });

  test('every item has id, url, title, date_published', () => {
    const json = JSON.parse(serializeJsonFeed([STUDY, NOTE_ATOM], META));
    for (const item of json.items) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.url).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.date_published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test('_syndication extension appears for items with syndicatedTo', () => {
    const json = JSON.parse(serializeJsonFeed([STUDY, NOTE_ATOM], META));
    const study = json.items.find((i: { id: string }) => i.id.includes('curfew-launch'));
    const note = json.items.find((i: { id: string }) => i.id.includes('on-finishing'));
    expect(study._syndication).toEqual(STUDY.syndicatedTo);
    expect(note._syndication).toBeUndefined();
  });

  test('empty items produces valid empty feed', () => {
    const json = JSON.parse(serializeJsonFeed([], META));
    expect(json.version).toBe('https://jsonfeed.org/version/1.1');
    expect(json.items).toEqual([]);
  });
});
