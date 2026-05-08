import { describe, expect, test } from 'vitest';
import { classifyMentionType, parseHEntry } from '../../workers/shared/microformats';

const TARGET = 'https://hypertext.studio/studies/curfew-launch';
const SOURCE = 'https://maggieappleton.com/notes/hypertext';

function inEntry(inner: string): string {
  return `<!doctype html><html><body><article class="h-entry">${inner}</article></body></html>`;
}

describe('classifyMentionType', () => {
  test('detects u-in-reply-to as reply', () => {
    const html = inEntry(`<a class="u-in-reply-to" href="${TARGET}">re:</a>`);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('reply');
  });

  test('detects u-like-of as like', () => {
    const html = inEntry(`<a class="u-like-of" href="${TARGET}"></a>`);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('like');
  });

  test('detects u-repost-of as repost', () => {
    const html = inEntry(`<a class="u-repost-of" href="${TARGET}"></a>`);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('repost');
  });

  test('detects u-bookmark-of as bookmark', () => {
    const html = inEntry(`<a class="u-bookmark-of" href="${TARGET}"></a>`);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('bookmark');
  });

  test('falls back to mention for plain link inside h-entry', () => {
    const html = inEntry(`<p>I read <a href="${TARGET}">this</a></p>`);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('mention');
  });

  test('only counts type properties whose href matches the target', () => {
    const html = inEntry(`
      <a class="u-like-of" href="https://elsewhere.example/post"></a>
      <a href="${TARGET}">unrelated link to target</a>
    `);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('mention');
  });

  test('reply takes precedence over like when both target the URL', () => {
    const html = inEntry(`
      <a class="u-like-of" href="${TARGET}"></a>
      <a class="u-in-reply-to" href="${TARGET}">re:</a>
    `);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('reply');
  });

  test('handles in-reply-to as a nested h-cite (not a bare URL)', () => {
    const html = inEntry(`
      <span class="u-in-reply-to h-cite">
        <a class="u-url" href="${TARGET}">the original</a>
        <span class="p-author h-card">
          <span class="p-name">Hypertext Studio</span>
        </span>
      </span>
      <p>response body</p>
    `);
    expect(classifyMentionType(html, TARGET, SOURCE)).toBe('reply');
  });

  test('resolves relative hrefs against the source baseUrl', () => {
    const sourceUrl = 'https://elsewhere.example/posts/x';
    const html = inEntry(
      `<a class="u-like-of" href="https://hypertext.studio/studies/curfew-launch"></a>`,
    );
    expect(classifyMentionType(html, TARGET, sourceUrl)).toBe('like');
  });
});

describe('parseHEntry', () => {
  test('extracts author name + url from a nested h-card', () => {
    const html = inEntry(`
      <span class="p-author h-card">
        <a class="p-name u-url" href="https://maggieappleton.com">Maggie Appleton</a>
      </span>
      <div class="e-content">A thoughtful reply.</div>
      <time class="dt-published" datetime="2026-04-12">April 12</time>
    `);
    const meta = parseHEntry(html, SOURCE);
    expect(meta.authorName).toBe('Maggie Appleton');
    expect(meta.authorUrl).toBe('https://maggieappleton.com');
    expect(meta.contentText).toBe('A thoughtful reply.');
    expect(meta.published).toBe('2026-04-12');
  });

  test('returns all nulls when html has no h-entry', () => {
    const html = '<!doctype html><html><body><p>no microformats here</p></body></html>';
    expect(parseHEntry(html, SOURCE)).toEqual({
      authorName: null,
      authorUrl: null,
      authorPhoto: null,
      contentText: null,
      contentHtml: null,
      published: null,
    });
  });

  test('falls back to e-content when summary is absent', () => {
    const html = inEntry(`<div class="e-content">Body text.</div>`);
    const meta = parseHEntry(html, SOURCE);
    expect(meta.contentText).toBe('Body text.');
  });
});
