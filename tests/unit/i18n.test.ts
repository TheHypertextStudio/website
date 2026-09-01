import { describe, it, expect } from 'vitest';
import t from '@/i18n';

describe('i18n', () => {
  it('keeps the public studio identity explicit', () => {
    expect(t.site.name).toBe('Hypertext Studio');
    expect(t.site.tagline).toBe('builds software for humans');
    expect(t.site.description).toContain('Docket, LogDate, and Curfew');
  });
});
