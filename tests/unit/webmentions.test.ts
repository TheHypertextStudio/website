import { describe, expect, test } from 'vitest';
import { excerptParagraphs } from '../../src/lib/webmentions';

describe('excerptParagraphs', () => {
  test('returns null for empty / null input', () => {
    expect(excerptParagraphs(null)).toBeNull();
    expect(excerptParagraphs('')).toBeNull();
    expect(excerptParagraphs('   \n  \t  ')).toBeNull();
  });

  test('returns the full content when below the extreme threshold', () => {
    const content =
      'A small reply that fits comfortably in a single paragraph. It has more than one sentence on purpose, to verify nothing inside the threshold is touched.';
    expect(excerptParagraphs(content)).toEqual([content]);
  });

  test('preserves multiple paragraphs separated by blank lines', () => {
    const content =
      'First paragraph of a thoughtful reply.\n\nSecond paragraph that builds on the first.\n\nA third closing line.';
    expect(excerptParagraphs(content)).toEqual([
      'First paragraph of a thoughtful reply.',
      'Second paragraph that builds on the first.',
      'A third closing line.',
    ]);
  });

  test('collapses single newlines inside a paragraph to spaces', () => {
    const content = 'A reply that\nhappens to wrap\nat soft line breaks.';
    expect(excerptParagraphs(content)).toEqual([
      'A reply that happens to wrap at soft line breaks.',
    ]);
  });

  test('does not truncate a 600-char single paragraph (well under threshold)', () => {
    const sentence =
      'This is a moderately long sentence that contributes to a paragraph of careful prose. ';
    const content = sentence.repeat(7).trim(); // ~600 chars
    const result = excerptParagraphs(content);
    expect(result).toEqual([content]);
  });

  test('keeps whole early paragraphs and drops trailing ones that would exceed cap', () => {
    // p1 = 13 chars, p2 = 1340 chars, p3 = 50 chars. With cap 1400:
    //   p1 fits (13). p1+p2 fits with separator (13+2+1340=1355). Adding p3
    //   would project to 1407 > 1400, so p3 must be dropped.
    const p2 = 'A long paragraph filled with careful prose that runs on. '.repeat(24); // 24 * 57 = 1368 chars (close enough)
    const content = `Short opener.\n\n${p2.trim()}\n\nTrailing paragraph that must not appear.`;
    const result = excerptParagraphs(content, 1400);
    expect(result).not.toBeNull();
    expect(result![0]).toBe('Short opener.');
    expect(result!.length).toBeGreaterThanOrEqual(1);
    expect(result!.join(' ')).not.toContain('Trailing paragraph');
  });

  test('truncates at a sentence boundary when a single paragraph exceeds cap', () => {
    // Clean prose with several sentence boundaries inside the window.
    const sentence = 'This is a careful sentence that contributes a complete thought. ';
    const content = sentence.repeat(40); // ~2560 chars
    const result = excerptParagraphs(content, 400);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    const out = result![0];
    // Must end with a period — clean sentence cut, never mid-word, no ellipsis.
    expect(out).toMatch(/[.!?]$/);
    expect(out.endsWith('…')).toBe(false);
    expect(out.length).toBeLessThanOrEqual(400);
  });

  test('prefers a sentence boundary over an ellipsis even when the boundary is early', () => {
    // Two short clean sentences, then a long run-on with only commas.
    const content =
      'First sentence is short. Second sentence is also short. ' +
      'Then a long run-on with no further sentence ends, just commas, more commas, '.repeat(20);
    const result = excerptParagraphs(content, 600);
    expect(result).not.toBeNull();
    const out = result![0];
    // The clean cut after "short." beats the ugly mid-stream ellipsis.
    expect(out.endsWith('…')).toBe(false);
    expect(out).toMatch(/[.!?]$/);
  });

  test('falls back to word-boundary ellipsis only when no sentence ends within window', () => {
    // No periods at all in the content — forces fallback path.
    const content = 'word '.repeat(400).trim();
    const result = excerptParagraphs(content, 200);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    const out = result![0];
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/wo…$/); // not cut mid-word
  });
});
