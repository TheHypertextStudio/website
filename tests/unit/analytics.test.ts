import { describe, expect, it } from 'vitest';
import { analyticsAllowed } from '../../src/lib/analytics';

describe('analytics privacy signals', () => {
  it.each([
    [{ doNotTrack: '1' }, {}],
    [{ doNotTrack: 'yes' }, {}],
    [{ globalPrivacyControl: true }, {}],
    [{ doNotTrack: '0', globalPrivacyControl: true }, {}],
    [{ msDoNotTrack: '1' }, {}],
    [{}, { doNotTrack: '1' }],
  ])('blocks the beacon when a privacy signal is active: %j', (browser, windowSignals) => {
    expect(analyticsAllowed(browser, windowSignals)).toBe(false);
  });

  it.each([{}, { doNotTrack: '0' }, { globalPrivacyControl: false }])(
    'allows configured analytics when no signal requests an opt-out: %j',
    (browser) => expect(analyticsAllowed(browser, {})).toBe(true),
  );
});
