/* Live tickers for the footer status panel. */

import { STUDIO_LOCATION } from '@/consts';

function tick(): void {
  const el = document.querySelector<HTMLElement>('[data-status="time"]');
  if (!el) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: STUDIO_LOCATION.timezone,
    timeZoneName: 'short',
    hour12: false,
  });
  el.textContent = fmt.format(now);
}

tick();
setInterval(tick, 60_000);

// Render time from Performance API.
const renderEl = document.querySelector<HTMLElement>('[data-status="render"]');
if (renderEl) {
  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (nav) {
    const ms = Math.max(0, Math.round(nav.responseEnd - nav.requestStart));
    renderEl.textContent = `${ms} ms`;
  }
}
