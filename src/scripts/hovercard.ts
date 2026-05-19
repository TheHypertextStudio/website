/* Hovercard manager — one popover element, many trigger kinds.
 *
 * Reads study + product metadata from the JSON payload embedded by
 * Base.astro, then opens #hovercard on hover/focus for study links, footnote
 * refs, heading anchors, product mentions, and citation rows.
 *
 * Visual style lives in HoverCard.astro; this file only owns dispatch,
 * timing, and positioning.
 */

import { isoDate, formatRelative } from '@/i18n/format';

type CardKind = 'study' | 'footnote' | 'anchor' | 'product' | 'citation';

interface StudyMeta {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  product?: string;
  tags: string[];
  timeRequired?: string;
}

interface ProductMeta {
  slug: string;
  name: string;
  tagline: string;
  stage: string;
  platforms: string[];
  question: string;
  screenshot: string;
}

const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 120;

let hovercard: HTMLElement | null = null;
let activeTrigger: HTMLElement | null = null;
let showTimer: number | null = null;
let hideTimer: number | null = null;
let positionFrame: number | null = null;
const studies = new Map<string, StudyMeta>();
const products = new Map<string, ProductMeta>();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadData(): void {
  const el = document.getElementById('hypertext-hovercard-data');
  if (!el?.textContent) return;
  try {
    const parsed = JSON.parse(el.textContent) as {
      studies?: StudyMeta[];
      products?: ProductMeta[];
    };
    for (const s of parsed.studies ?? []) studies.set(s.slug, s);
    for (const p of parsed.products ?? []) products.set(p.slug, p);
  } catch {
    /* leave maps empty — script becomes a no-op */
  }
}

interface CardSections {
  kind: string;
  pill?: string;
  title?: string;
  summary?: string;
  body?: string;
  meta?: string;
  tags?: string[];
}

function renderShell(s: CardSections): string {
  const pillNode = s.pill ? `<span class="hc-pill">${escapeHtml(s.pill)}</span>` : '';
  const titleNode = s.title ? `<h3 class="hc-title">${escapeHtml(s.title)}</h3>` : '';
  const summaryNode = s.summary ? `<p class="hc-summary">${escapeHtml(s.summary)}</p>` : '';
  const bodyNode = s.body ?? '';
  const metaNode = s.meta ?? '';
  const tagsNode = s.tags?.length
    ? `<ul class="hc-tags" role="list">${s.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
    : '';
  return `<header class="hc-head"><span class="hc-kind">${escapeHtml(s.kind)}</span>${pillNode}</header>${titleNode}${summaryNode}${bodyNode}${metaNode}${tagsNode}`;
}

function studySlug(href: string): string {
  return href.match(/^\/studies\/([^?#/]+)/)?.[1] ?? '';
}

function renderStudy(trigger: HTMLAnchorElement): string | null {
  const data = studies.get(studySlug(trigger.getAttribute('href') ?? ''));
  if (!data) return null;
  const dateParts = [
    `<time datetime="${escapeHtml(data.publishedAt)}">${escapeHtml(isoDate(data.publishedAt))}</time>`,
    data.timeRequired ? `<span>${escapeHtml(data.timeRequired)}</span>` : '',
    `<span class="hc-rel">${escapeHtml(formatRelative(data.publishedAt))}</span>`,
  ]
    .filter(Boolean)
    .join('<span class="hc-sep">·</span>');
  return renderShell({
    kind: 'Study',
    pill: data.product,
    title: data.title,
    summary: data.summary,
    meta: `<footer class="hc-meta">${dateParts}</footer>`,
    tags: data.tags?.slice(0, 4),
  });
}

function renderFootnote(trigger: HTMLAnchorElement): string | null {
  const id = (trigger.getAttribute('href') ?? '').slice(1);
  const li = id ? document.getElementById(id) : null;
  if (!li) return null;
  const clone = li.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('a[data-footnote-backref], .data-footnote-backref')
    .forEach((el) => el.remove());
  return renderShell({
    kind: `Footnote ${(trigger.textContent ?? '').trim()}`,
    body: `<div class="hc-body">${clone.innerHTML}</div>`,
  });
}

function renderAnchor(trigger: HTMLAnchorElement): string | null {
  const heading = trigger.closest('h1, h2, h3, h4, h5, h6');
  if (!heading) return null;
  const headingClone = heading.cloneNode(true) as HTMLElement;
  headingClone.querySelectorAll('a.anchor').forEach((el) => el.remove());
  let para: HTMLElement | null = null;
  let cursor = heading.nextElementSibling;
  while (cursor && !para) {
    if (cursor.tagName === 'P') para = cursor as HTMLElement;
    else if (/^H[1-6]$/.test(cursor.tagName)) break;
    cursor = cursor.nextElementSibling;
  }
  const body = para
    ? `<p class="hc-preview">${para.innerHTML}</p>`
    : '<p class="hc-preview hc-muted">No preview available.</p>';
  return renderShell({
    kind: `Section ${heading.tagName.toLowerCase()}`,
    title: (headingClone.textContent ?? '').trim(),
    body,
  });
}

function renderProduct(trigger: HTMLElement): string | null {
  const data = products.get(trigger.dataset.product ?? '');
  if (!data) return null;
  return renderShell({
    kind: 'Product',
    pill: data.stage,
    title: data.name,
    summary: data.question,
    tags: data.platforms,
  });
}

function renderCitation(trigger: HTMLElement): string | null {
  const { author = '', source = '', date = '', excerpt = '' } = trigger.dataset;
  if (!author && !source) return null;
  return renderShell({
    kind: 'Citation',
    pill: date ? isoDate(date) : undefined,
    title: author,
    summary: excerpt || undefined,
    meta: source
      ? `<p class="hc-meta-line"><span class="hc-source">${escapeHtml(source)}</span></p>`
      : '',
  });
}

const renderers: { [K in CardKind]: (trigger: HTMLElement) => string | null } = {
  study: (t) => renderStudy(t as HTMLAnchorElement),
  footnote: (t) => renderFootnote(t as HTMLAnchorElement),
  anchor: (t) => renderAnchor(t as HTMLAnchorElement),
  product: renderProduct,
  citation: renderCitation,
};

function findKind(target: HTMLElement): { trigger: HTMLElement; kind: CardKind } | null {
  if (target.closest('[data-hovercard-skip]')) return null;

  const explicit = target.closest<HTMLElement>('[data-hovercard]');
  if (explicit) {
    const kind = explicit.dataset.hovercard as CardKind;
    if (kind === 'product' || kind === 'citation') return { trigger: explicit, kind };
  }

  const anchor = target.closest<HTMLAnchorElement>(
    ':is(h1, h2, h3, h4, h5, h6) > a[href^="#"], a.anchor[href^="#"]',
  );
  if (anchor) return { trigger: anchor, kind: 'anchor' };

  const fnref = target.closest<HTMLAnchorElement>(
    'a[data-footnote-ref], sup > a[href^="#user-content-fn"]',
  );
  if (fnref) return { trigger: fnref, kind: 'footnote' };

  const study = target.closest<HTMLAnchorElement>('a[href^="/studies/"]');
  if (study && /^\/studies\/[^?#/]+/.test(study.getAttribute('href') ?? '')) {
    return { trigger: study, kind: 'study' };
  }

  return null;
}

function positionCard(trigger: HTMLElement): void {
  if (!hovercard) return;
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  hovercard.style.visibility = 'hidden';
  hovercard.style.left = '0';
  hovercard.style.top = '0';
  if (!hovercard.matches(':popover-open')) hovercard.showPopover?.();
  const cardRect = hovercard.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = r.bottom + margin;
  if (top + cardRect.height > vh - margin) {
    const above = r.top - margin - cardRect.height;
    if (above >= margin) top = above;
  }
  let left = r.left;
  if (left + cardRect.width > vw - margin) left = vw - margin - cardRect.width;
  if (left < margin) left = margin;

  hovercard.style.left = `${Math.round(left)}px`;
  hovercard.style.top = `${Math.round(top)}px`;
  hovercard.style.visibility = '';
}

function schedulePosition(): void {
  if (!activeTrigger || positionFrame !== null) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = null;
    if (activeTrigger) positionCard(activeTrigger);
  });
}

function showFor(trigger: HTMLElement, kind: CardKind): void {
  if (!hovercard || activeTrigger === trigger) return;
  const html = renderers[kind](trigger);
  if (!html) return;
  hovercard.dataset.kind = kind;
  hovercard.innerHTML = html;
  activeTrigger = trigger;
  positionCard(trigger);
  window.addEventListener('scroll', schedulePosition, { passive: true });
  window.addEventListener('resize', schedulePosition);
}

function hide(): void {
  if (positionFrame !== null) {
    cancelAnimationFrame(positionFrame);
    positionFrame = null;
  }
  window.removeEventListener('scroll', schedulePosition);
  window.removeEventListener('resize', schedulePosition);
  if (hovercard?.matches(':popover-open')) hovercard.hidePopover?.();
  activeTrigger = null;
}

function clearTimers(): void {
  if (showTimer !== null) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function onEnter(event: MouseEvent | FocusEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  // Cheap pre-filter: nothing interactive nearby, nothing to do.
  if (!target.closest('a, [data-hovercard]')) return;
  const match = findKind(target);
  if (!match) return;
  clearTimers();
  showTimer = window.setTimeout(() => showFor(match.trigger, match.kind), SHOW_DELAY_MS);
}

function onLeave(event: MouseEvent | FocusEvent): void {
  const related = (event as MouseEvent).relatedTarget;
  if (related instanceof Node && hovercard?.contains(related)) return;
  clearTimers();
  hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
}

function autoWrapProductMentions(): void {
  if (products.size === 0) return;
  const roots = document.querySelectorAll('.study-body');
  if (roots.length === 0) return;

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = Array.from(products.values());
  const detectPattern = new RegExp(`\\b(${names.map((p) => escapeRegex(p.name)).join('|')})\\b`);
  const replacePattern = new RegExp(detectPattern.source, 'g');
  const slugByName = new Map(names.map((p) => [p.name, p.slug]));

  for (const root of Array.from(roots)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('a, h1, h2, h3, h4, h5, h6, code, pre, [data-hovercard]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return detectPattern.test(node.nodeValue ?? '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const candidates: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) candidates.push(n as Text);
    for (const text of candidates) {
      const value = text.nodeValue ?? '';
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      replacePattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = replacePattern.exec(value)) !== null) {
        const matched = m[1];
        if (!matched) continue;
        if (m.index > lastIndex)
          frag.appendChild(document.createTextNode(value.slice(lastIndex, m.index)));
        const span = document.createElement('span');
        span.dataset.hovercard = 'product';
        span.dataset.product = slugByName.get(matched) ?? '';
        span.className = 'product-mention';
        span.textContent = matched;
        frag.appendChild(span);
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < value.length)
        frag.appendChild(document.createTextNode(value.slice(lastIndex)));
      text.parentNode?.replaceChild(frag, text);
    }
  }
}

function init(): void {
  hovercard = document.getElementById('hovercard');
  if (!hovercard) return;
  loadData();

  document.addEventListener('mouseover', onEnter);
  document.addEventListener('mouseout', onLeave);
  document.addEventListener('focusin', onEnter);
  document.addEventListener('focusout', onLeave);
  hovercard.addEventListener('mouseenter', clearTimers);
  hovercard.addEventListener('mouseleave', (event) => {
    if (event.relatedTarget instanceof Node && activeTrigger?.contains(event.relatedTarget)) return;
    clearTimers();
    hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
  });

  // Auto-wrap is the only DOM-mutating step; defer it past first paint.
  const idle =
    window.requestIdleCallback ??
    ((cb: IdleRequestCallback) =>
      window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1));
  idle(() => autoWrapProductMentions(), { timeout: 1500 });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
