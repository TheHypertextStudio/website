# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Convention: every merged PR adds at least one bullet under `[Unreleased]`,
in `Added` / `Changed` / `Fixed` / `Removed` / `Deprecated` / `Security` as
appropriate. Promote `[Unreleased]` to a dated version section on tag.

## [Unreleased]

### Added

- IndieWeb tier 3 display layer: `Citations.astro` and `Colophon.astro` components rendering at the foot of every study and note. Citation register, no avatar grid, no comment form. See `docs/indieweb.md` for the conceptual frame.
- `[slug].astro` routes for studies and notes, with full h-entry microformats and a build-time fetch of received webmentions via `src/lib/webmentions.ts`.
- POSSE colophon: `syndicatedTo` and `inReplyTo` frontmatter fields on both content collections; `u-syndication` markup on syndication links; a quiet "how to respond" note on every published document.
- `mention_type` classification in `workers/webmention/index.ts` — distinguishes replies, likes, reposts, bookmarks, and bare-link mentions. Powers the Citations component's "Liked by N · Reposted by N" aggregate row.
- `microformats-parser` adopted in the worker for full mf2 conformance (nested h-cites, implied properties, baseUrl resolution).
- `tests/unit/microformats.test.ts` (12 cases) and `tests/unit/webmentions.test.ts` (9 cases) covering the classifier, h-entry extraction, and excerpt truncation.
- `tests/e2e/citations.spec.ts` and `tests/a11y/citations.spec.ts` covering colophon rendering, empty-state handling, syndication markup, and a11y on the new routes.
- Tests-only content collection: fixtures live under `tests/fixtures/content/` and merge into the public collections only when `HYPERTEXT_INCLUDE_FIXTURES=1`.
- `docs/indieweb.md` — dedicated doc for the studio's IndieWeb integration, posture, and conformance.
- Initial repo scaffold: Astro + Cloudflare Pages target, pnpm + corepack pinning, base configs (Prettier, ESLint, EditorConfig, TS strict), VS Code workspace, MIT license.

### Changed

- D1 schema: `webmentions` gains `mention_type TEXT NOT NULL DEFAULT 'mention'` plus an index. Existing dev databases need a one-shot `ALTER TABLE` — see the comment at the bottom of `workers/shared/d1-schema.sql`.
- `GET /webmentions?target=…` now returns mentions grouped by type, so the page layer renders aggregates without re-counting.
- `tsconfig.json`: removed `.astro` from `exclude` so `tsc` can pick up Astro's generated `.astro/types.d.ts` (declares `ImportMeta.env` and the `astro:content` virtual module). Added `pretypecheck: astro sync` to keep those types fresh.
- `Footer/Marquee` is now a `<section>` instead of `<aside>` so the site's a11y suite passes the `landmark-complementary-is-top-level` rule across every page.

### Fixed

- Three product taglines in `src/i18n/en.json` now match `docs/mission.md` §4 verbatim (LogDate, Curfew, Termsly).
- Locality drift between `src/consts.ts`, `docs/operations.md`, `tests/e2e/microformats.spec.ts`, and the JSON-LD `Organization.address` resolved to "Las Vegas" (matches the studio's actual address).
- Site-wide a11y suite (home, privacy, colophon, studies, contact) passes axe at wcag2aa + wcag22aa + best-practice tags.
- Command palette: dialog open animation no longer fades in opacity (would briefly drop text contrast below WCAG AA mid-frame). Selected-item kind/shortcut text lifts to `--color-text` so the background tint doesn't break contrast either.
- Command palette: `setSelected` now resets `aria-selected` on every item, not just visible ones, so filtering doesn't leave a stale selection on a hidden row.
- Print stylesheet hides `.footer-marquee` directly (not just via the parent footer), matching the test's expectation.
- Hold-modifier hint: keyboard handler now treats both `Meta` and `Control` as the modifier key. Previously relied on a UA sniff that misfires under headless Chromium (which reports a Windows UA on macOS hosts).
- Status bar: hovering or focusing any link mirrors its `href` into the bar's `[data-url]` slot — early-web "destination on hover" affordance restored. Cleared on mouseout / blur.
- Footer: new `<Colophon>` band lists typefaces, framework, hosting, and source as a typeset `<dl>` with linkable entries; new `<Signature>` band closes with an italic salutation; SmallPrint gains a `print this page` button alongside `view source` and `⌘K`.
- Poem band carries a build-embedded fallback string (read from `i18n.footer.poem.fallback`), so the closing scene reads complete even when the DNS-poem worker is unreachable.
- Long URLs and inline `<code>` spans in prose pages now `overflow-wrap: anywhere`, so `/privacy` and `/colophon` no longer overflow at the 320 px mobile viewport.
- Schema.org JSON-LD on the home page emits a `SoftwareApplication` node for every product the studio claims, regardless of ship status. Products without a live URL omit the optional `url` field.
- 404 copy aligned with the studio's plain-language register; the test now disambiguates the "Home" link via `rel="home"`.
- The `Product entries` test suite now matches `<ProductEntry>`'s research-index design (no "Visit" CTA, no `.product-card` class) instead of the older dialog-based card UI.
- The Playwright + Vitest suites both run green on `chromium` against a production build: 24 unit tests, 180 e2e + a11y tests passing, 21 deliberately skipped (with explanatory comments) for the dialog-based ProductCard UI that hasn't shipped yet.
