/* Click # permalinks to copy the canonical URL. Confirms via status bar. */

function setStatus(text: string, ms = 0): void {
  const el = document.querySelector<HTMLElement>('#status-bar [data-url]');
  if (!el) return;
  el.textContent = text;
  if (ms > 0) setTimeout(() => (el.textContent = ''), ms);
}

document.querySelectorAll<HTMLAnchorElement>('a.anchor[href^="#"]').forEach((a) => {
  a.addEventListener('click', async (e) => {
    const id = a.getAttribute('href')?.slice(1);
    if (!id) return;
    e.preventDefault();
    const url = new URL(`#${id}`, location.href).toString();
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard?.writeText(url);
      setStatus(`copied · ${url}`, 1800);
    } catch {
      /* clipboard unavailable; URL still updated */
    }
  });
});
