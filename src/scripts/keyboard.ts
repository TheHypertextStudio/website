/* Keyboard layer: command palette + sequence shortcuts + hold-modifier hint.
 * Single config-driven keymap. ≤200 LOC including types.
 */

interface PaletteItem {
  kind: string;
  label: string;
  href?: string;
  openDialog?: string;
  action?: string;
  shortcut?: string;
  external?: boolean;
}

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

// Treat both Meta (Mac convention) and Control (Win/Linux convention) as the
// modifier. This keeps the hold-modifier hint working regardless of how the
// browser reports its platform — particularly headless Chromium under
// Playwright, where the userAgent doesn't reflect the host OS.
const isModKey = (key: string): boolean => key === 'Meta' || key === 'Control';

document.documentElement.setAttribute('data-js', 'on');

// ---------------------------------------------------------------------------
// Sequence shortcuts: g h, g w, g s, g c, ?
// ---------------------------------------------------------------------------

let seqBuffer = '';
let seqTimer: number | null = null;

const SEQUENCES: Record<string, () => void> = {
  'g h': () => navigate('/'),
  'g w': () => navigate('/#work'),
  'g a': () => navigate('/about'),
  'g s': () => navigate('/studies'),
  'g n': () => navigate('/notes'),
  'g c': () => navigate('/colophon'),
};

function navigate(href: string): void {
  if (href.startsWith('#') || href.includes('#')) {
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', url.hash);
      return;
    }
  }
  location.href = href;
}

function pushSeq(key: string): void {
  seqBuffer = (seqBuffer ? seqBuffer + ' ' : '') + key;
  if (seqTimer) window.clearTimeout(seqTimer);
  seqTimer = window.setTimeout(() => (seqBuffer = ''), 1000);
  const fn = SEQUENCES[seqBuffer];
  if (fn) {
    seqBuffer = '';
    if (seqTimer) {
      window.clearTimeout(seqTimer);
      seqTimer = null;
    }
    fn();
  }
}

// ---------------------------------------------------------------------------
// Hold-modifier reveals shortcuts in the status bar.
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (isModKey(e.key)) {
    document.documentElement.setAttribute('data-modifier', 'on');
  }
});
document.addEventListener('keyup', (e) => {
  if (isModKey(e.key)) {
    document.documentElement.removeAttribute('data-modifier');
  }
});
window.addEventListener('blur', () => document.documentElement.removeAttribute('data-modifier'));

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const palette = document.querySelector<HTMLDialogElement>('#command-palette');
const input = document.querySelector<HTMLInputElement>('#palette-input');
const list = document.querySelector<HTMLUListElement>('#palette-results');
const empty = document.querySelector<HTMLElement>('#palette-empty');

function openPalette(): void {
  if (!palette) return;
  palette.showModal();
  input?.focus();
  input && (input.value = '');
  filter('');
  setSelected(0);
}

function closePalette(): void {
  palette?.close();
}

function items(): HTMLElement[] {
  return Array.from(list?.querySelectorAll<HTMLElement>('.palette__item') ?? []);
}

function setSelected(index: number): void {
  // Reset every item — including hidden ones — so the previously-selected
  // entry doesn't keep its aria-selected when filtering hides it.
  items().forEach((el) => el.setAttribute('aria-selected', 'false'));
  const visible = items().filter((el) => !el.hidden);
  const target = visible[Math.max(0, Math.min(index, visible.length - 1))];
  if (target) {
    target.setAttribute('aria-selected', 'true');
    target.scrollIntoView({ block: 'nearest' });
  }
}

function activate(el: HTMLElement): void {
  closePalette();
  const dialogId = el.dataset.openDialog;
  if (dialogId) {
    document.querySelector<HTMLDialogElement>(`#${dialogId}`)?.showModal();
    return;
  }
  const action = el.dataset.action;
  if (action === 'print') {
    window.print();
    return;
  }
  if (action === 'shortcuts') {
    document.querySelector<HTMLDialogElement>('#shortcut-sheet')?.showModal();
    return;
  }
  const href = el.dataset.href;
  if (href) {
    if (el.dataset.external === 'true') window.open(href, '_blank', 'noopener');
    else navigate(href);
  }
}

function filter(query: string): void {
  const q = query.trim().toLowerCase();
  const all = items();
  let visible = 0;
  for (const el of all) {
    const label = (el.querySelector('.palette__label')?.textContent ?? '').toLowerCase();
    const match = q === '' || label.includes(q);
    el.hidden = !match;
    if (match) visible += 1;
  }
  if (empty) empty.hidden = visible > 0;
  setSelected(0);
}

input?.addEventListener('input', () => filter(input.value));
input?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const all = items().filter((el) => !el.hidden);
    const current = all.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    const next = e.key === 'ArrowDown' ? current + 1 : current - 1;
    setSelected((next + all.length) % all.length);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const sel = items().find((el) => el.getAttribute('aria-selected') === 'true');
    if (sel) activate(sel);
  } else if (e.key === 'Escape') {
    closePalette();
  }
});

list?.addEventListener('click', (e) => {
  const item = (e.target as HTMLElement).closest<HTMLElement>('.palette__item');
  if (item) activate(item);
});

// ---------------------------------------------------------------------------
// Global keydown
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (isEditable(e.target)) return;
  if (document.querySelector<HTMLDialogElement>('dialog[open]:not(#command-palette)')) return;

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (palette?.open) closePalette();
    else openPalette();
    return;
  }
  if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    document.querySelector<HTMLDialogElement>('#shortcut-sheet')?.showModal();
    return;
  }
  if (e.key === 'Escape' && palette?.open) {
    closePalette();
    return;
  }

  // Sequence shortcuts (single letters, no modifier).
  if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
    pushSeq(e.key.toLowerCase());
  }
});

// Status-bar URL echo lives in src/components/StatusBar.astro alongside the
// element it writes to.
