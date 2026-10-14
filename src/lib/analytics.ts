interface PrivacySignals {
  doNotTrack?: string | null;
  msDoNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}

export function analyticsAllowed(browser: PrivacySignals, windowSignals: PrivacySignals): boolean {
  const optedOut = (value: string | null | undefined) => value === '1' || value === 'yes';
  return !(
    browser.globalPrivacyControl === true ||
    optedOut(browser.doNotTrack) ||
    optedOut(browser.msDoNotTrack) ||
    optedOut(windowSignals.doNotTrack)
  );
}

export function loadAnalytics(token: string | undefined): void {
  if (!token?.trim() || !analyticsAllowed(navigator, window as Window & PrivacySignals)) return;
  const script = document.createElement('script');
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.defer = true;
  script.dataset.cfBeacon = JSON.stringify({ token: token.trim() });
  document.head.append(script);
}
