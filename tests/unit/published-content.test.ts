import { describe, expect, test } from 'vitest';
import { isPublishedStudy } from '@/lib/published-content';

describe('isPublishedStudy', () => {
  test('publishes only entries explicitly marked draft: false', () => {
    expect(isPublishedStudy({ data: { draft: false } } as never)).toBe(true);
    expect(isPublishedStudy({ data: { draft: true } } as never)).toBe(false);
    expect(isPublishedStudy({ data: {} } as never)).toBe(false);
  });
});
