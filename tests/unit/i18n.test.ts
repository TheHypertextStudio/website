import { describe, it, expect } from 'vitest';
import t from '@/i18n';

describe('i18n', () => {
  it('has every product locked tagline (per spec §4.3)', () => {
    expect(t.work.products.logdate.tagline).toBe(
      'A better home to document and store your memories.',
    );
    expect(t.work.products.curfew.tagline).toBe(
      'Software for the version of you that planned ahead.',
    );
    expect(t.work.products.termsly.tagline).toBe("Know what you're agreeing to.");
  });

  it('has the thesis sentence verbatim', () => {
    expect(t.thesis.body).toBe(
      'Hypertext Studio explores how to create sustainable human-centered software.',
    );
  });
});
