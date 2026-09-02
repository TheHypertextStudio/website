#!/usr/bin/env node
/**
 * Capture every state of the website as a PNG.
 *
 * Output tree (under .hypertext/screenshots/):
 *   pages/<route>-<viewport>.png             every page, three viewports
 *   pages/<route>-<viewport>-full.png        full-scroll capture
 *   interactions/<state>.png                 every interactive overlay
 *   modes/<mode>.png                         theme + media-query variants
 *   components/<component>.png               element-level captures
 *
 * Usage:
 *   make screenshots             # uses an already-running dev server, else boots one
 *   pnpm run screenshots
 *   BASE_URL=https://… node scripts/screenshots.mjs   # against a remote host
 *
 * This script is intentionally not a Playwright test — keeps screenshot runs
 * out of the regression flow and lets us iterate visually without `--grep`.
 */

import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// fileURLToPath handles spaces / unicode safely (the project path has a space).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.hypertext', 'screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const QUIET = process.env.QUIET === '1';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'about', path: '/about' },
  { slug: 'notes', path: '/notes' },
  { slug: 'privacy', path: '/privacy' },
  { slug: 'colophon', path: '/colophon' },
  { slug: 'studies', path: '/studies' },
  { slug: 'contact', path: '/contact' },
  { slug: '404', path: '/this-route-does-not-exist', expectedStatus: 404 },
];

const PRODUCTS = ['docket', 'logdate', 'curfew'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Progress to stderr; console.error is convention here, not a failure signal.
const log = (msg) => !QUIET && console.error(msg);

async function ensureServer() {
  // Try BASE; if it answers, reuse it. Otherwise spawn `pnpm run dev:astro`.
  try {
    const ok = await fetch(BASE)
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) {
      log(`  ✓ using existing server at ${BASE}`);
      return null;
    }
  } catch {
    /* fall through to spawn */
  }

  log(`  ▸ starting dev server`);
  const proc = spawn('pnpm', ['run', 'dev:astro'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  // Wait until it answers on the port.
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    if (
      await fetch(BASE)
        .then((r) => r.ok)
        .catch(() => false)
    ) {
      log('  ✓ dev server up');
      return proc;
    }
    await wait(300);
  }
  proc.kill();
  throw new Error(`dev server did not respond at ${BASE} within 20s`);
}

async function capture(page, file, opts = {}) {
  const full = path.join(OUT, file);
  await mkdir(path.dirname(full), { recursive: true });
  await page.screenshot({ path: full, fullPage: false, ...opts });
  log(`  ${file}`);
}

async function captureLocator(locator, file) {
  const full = path.join(OUT, file);
  await mkdir(path.dirname(full), { recursive: true });
  await locator.screenshot({ path: full });
  log(`  ${file}`);
}

// ---------------------------------------------------------------------------
// Capture suites
// ---------------------------------------------------------------------------

async function capturePages(browser) {
  log('\n▸ pages × viewports');
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    for (const { slug, path: route, expectedStatus = 200 } of PAGES) {
      const response = await page.goto(BASE + route, {
        waitUntil: 'networkidle',
        timeout: 15_000,
      });
      if (!response || response.status() !== expectedStatus) {
        throw new Error(
          `${route} returned ${response?.status() ?? 'no response'}; expected ${expectedStatus}`,
        );
      }
      await wait(150);
      await capture(page, `pages/${slug}-${vp.name}.png`);
      await capture(page, `pages/${slug}-${vp.name}-full.png`, { fullPage: true });
    }
    await ctx.close();
  }
}

async function captureInteractions(browser) {
  log('\n▸ interactive states');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const productLink = page.locator('.product-card__footer a').first();
  await productLink.hover();
  await wait(150);
  await capture(page, 'interactions/product-link-hover.png');

  await productLink.focus();
  await wait(150);
  await capture(page, 'interactions/product-link-focus.png');

  const footer = page.locator('.site-footer');
  await footer.scrollIntoViewIfNeeded();
  const footerLink = footer.locator('.footer-link').first();
  await footerLink.hover();
  await wait(150);
  await capture(page, 'interactions/footer-link-hover.png');

  await footerLink.focus();
  await wait(150);
  await capture(page, 'interactions/footer-link-focus.png');

  await ctx.close();
}

async function captureModes(browser) {
  log('\n▸ media + theme modes');

  const matrix = [
    { name: 'reduced-motion', opts: { reducedMotion: 'reduce' } },
    { name: 'contrast-more', opts: { contrast: 'more' } },
    { name: 'forced-colors', opts: { forcedColors: 'active' } },
  ];

  for (const m of matrix) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...m.opts,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await wait(200);
    await capture(page, `modes/${m.name}.png`, { fullPage: true });
    await ctx.close();
  }

  // Print media emulation.
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 1280 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await wait(200);
  await capture(page, 'modes/print.png', { fullPage: true });

  if (page.context().browser()?.browserType().name() === 'chromium') {
    const pdf = await page.pdf({ format: 'Letter' });
    const out = path.join(OUT, 'modes', 'print.pdf');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, pdf);
    log('  modes/print.pdf');
  }
  await ctx.close();
}

async function captureComponents(browser) {
  log('\n▸ component close-ups');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // The home page's bar is deliberately bare at the top — the hero owns the
  // studio name there — so the resting bar is captured from a page that has
  // no hero, and the home page contributes its scrolled state instead.
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' });
  await captureLocator(page.locator('header.site-header'), 'components/header.png');

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await captureLocator(page.locator('.home-hero'), 'components/hero.png');

  await page.evaluate(() => window.scrollTo(0, 600));
  await wait(200);
  await captureLocator(page.locator('header.site-header'), 'components/header-scrolled.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(200);

  for (const slug of PRODUCTS) {
    await captureLocator(
      page.locator(`article.product-card#${slug}`),
      `components/card-${slug}.png`,
    );
  }

  await captureLocator(page.locator('.footer-directory'), 'components/footer-directory.png');
  await captureLocator(page.locator('.closing-tag'), 'components/footer-closing-tag.png');

  // The full footer at viewport size.
  await page
    .locator('footer.site-footer')
    .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await wait(200);
  await capture(page, 'components/footer-full.png');

  await ctx.close();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const server = await ensureServer();
const browser = await chromium.launch();
try {
  await capturePages(browser);
  await captureInteractions(browser);
  await captureModes(browser);
  await captureComponents(browser);
} finally {
  await browser.close();
  if (server) {
    server.kill('SIGTERM');
  }
}

const total = await import('node:fs/promises').then(async (fs) => {
  const list = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const e of entries) {
      if (e.isDirectory()) count += await list(path.join(dir, e.name));
      else if (e.name.endsWith('.png') || e.name.endsWith('.pdf')) count += 1;
    }
    return count;
  };
  return list(OUT);
});

log(`\n  ✓ ${total} captures saved under .hypertext/screenshots/`);
