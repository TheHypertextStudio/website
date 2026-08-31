import { expect, test } from '@playwright/test';
import en from '../../src/i18n/en.json' with { type: 'json' };

/**
 * Citations + Colophon. The Citations section is built from a build-time
 * fetch against the live worker; in a local dev environment it is typically
 * empty, so these tests primarily assert:
 *
 *   - Empty state: the section is absent, not a placeholder.
 *   - Colophon: present on every published study/note with the expected
 *     fields, syndication links, and a respond note.
 *
 * Populated-citation rendering is covered by unit tests on the data layer
 * (tests/unit/webmentions.test.ts) and by manual review.
 *
 * The fixture paths below depend on HYPERTEXT_INCLUDE_FIXTURES being set in
 * playwright.config.ts's webServer env so the fixture content collection is
 * loaded; see src/content.config.ts for the contract.
 */

const STUDY_PATH = '/studies/curfew-launch';
const NOTE_PATH = '/notes/2026-04-08-on-finishing';
const colophon = en.indieweb.colophon;

test.describe.configure({ timeout: 60_000 });

test.describe('Colophon — study', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STUDY_PATH);
  });

  test('Colophon section is present', async ({ page }) => {
    await expect(page.locator('aside.post-colophon')).toHaveCount(1);
  });

  test('First published row carries dt-published and a date', async ({ page }) => {
    const dl = page.locator('aside.post-colophon dl');
    await expect(dl).toContainText(colophon.firstPublished);
    const time = dl.locator('time.dt-published');
    const datetime = await time.getAttribute('datetime');
    expect(datetime).toMatch(/^2026-04-08/);
  });

  test('Last revised row appears when modifiedAt is set', async ({ page }) => {
    const dl = page.locator('aside.post-colophon dl');
    await expect(dl).toContainText(colophon.lastRevised);
    const time = dl.locator('time.dt-updated');
    const datetime = await time.getAttribute('datetime');
    expect(datetime).toMatch(/^2026-04-12/);
  });

  test('Also at lists only publicly enabled syndication links', async ({ page }) => {
    const dl = page.locator('aside.post-colophon dl');
    await expect(dl).toContainText(colophon.alsoAt);
    const links = page.locator('aside.post-colophon a.u-syndication');
    await expect(links).toHaveCount(1);
    const first = links.first();
    await expect(first).toHaveAttribute('rel', /syndication/);
    const href = await first.getAttribute('href');
    expect(href).toBe('https://fed.brid.gy/r/https://hypertext.studio/studies/curfew-launch');
    await expect(page.locator('a.u-syndication[href*="bsky.app"]')).toHaveCount(0);
  });

  test('Respond note is present, with no comment form', async ({ page }) => {
    const respond = page.locator('aside.post-colophon .post-colophon-respond');
    await expect(respond).toHaveText(colophon.respondNote);
    // Document, not app: there must be no form, textarea, or submit button.
    await expect(page.locator('aside.post-colophon form')).toHaveCount(0);
    await expect(page.locator('aside.post-colophon textarea')).toHaveCount(0);
    await expect(page.locator('aside.post-colophon button[type="submit"]')).toHaveCount(0);
  });
});

test.describe('Colophon — note', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NOTE_PATH);
  });

  test('Colophon section is present', async ({ page }) => {
    await expect(page.locator('aside.post-colophon')).toHaveCount(1);
  });

  test('First published row is present', async ({ page }) => {
    await expect(page.locator('aside.post-colophon dl')).toContainText(colophon.firstPublished);
  });

  test('Last revised row is hidden when modifiedAt is unset', async ({ page }) => {
    await expect(page.locator('aside.post-colophon dl')).not.toContainText(colophon.lastRevised);
  });

  test('Respond note copy is identical across documents', async ({ page }) => {
    await expect(page.locator('aside.post-colophon .post-colophon-respond')).toHaveText(
      colophon.respondNote,
    );
  });
});

test.describe('Citations — empty state', () => {
  test('study with no webmentions renders no citations section', async ({ page }) => {
    await page.goto(STUDY_PATH);
    // The Citations <section> is omitted entirely when both the bibliographic
    // list and lightweight aggregates are empty. Empty state = silence.
    await expect(page.locator('section.citations')).toHaveCount(0);
  });

  test('note with no webmentions renders no citations section', async ({ page }) => {
    await page.goto(NOTE_PATH);
    await expect(page.locator('section.citations')).toHaveCount(0);
  });
});
