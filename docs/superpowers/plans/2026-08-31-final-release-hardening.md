# Hypertext Studio Website Final Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete website release path fail-closed, secure at every public input, reproducible in CI, and ready for a separately authorized production publication.

**Architecture:** Public content and identity are selected through shared fail-closed helpers and build generators. Worker endpoints share bounded HTTP utilities and are tested both as pure logic and inside workerd. One GitHub Actions workflow validates and builds once, then conditionally migrates and deploys that exact commit through a protected production job.

**Tech Stack:** Astro 7, TypeScript 6, Vitest 4, Playwright, Cloudflare Workers and D1, Wrangler 4, pnpm 10, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-31-final-release-hardening-design.md`

## Global Constraints

- Do not change the approved public visual design.
- Draft publication, optional social identities, protocol identity, and deployment eligibility fail closed.
- GitHub Actions is the only automated production deployment owner; explicit local Wrangler deployment remains a break-glass path.
- CI builds one site artifact per commit and deploys that artifact without rebuilding it.
- Pull requests never receive production credentials or deploy production.
- Preserve unrelated untracked `.superpowers/` files and the 2026-08-30 planning documents.
- Do not push or publish during implementation.

---

### Task 1: Centralize the Publication Boundary

**Files:**

- Create: `src/lib/published-content.ts`
- Modify: `src/content.config.ts`
- Modify: `src/pages/studies/index.astro`
- Modify: `src/pages/studies/[slug].astro`
- Modify: `src/lib/feed-collections.ts`
- Modify: `src/pages/llms-full.txt.ts`
- Test: `tests/unit/published-content.test.ts`
- Test: `tests/e2e/discovery.spec.ts`

**Interfaces:**

- Produces: `isPublishedStudy(entry): boolean`
- Produces: `getPublishedStudies(): Promise<CollectionEntry<'studies'>[]>`
- Consumers: study routes, feed collection, and machine-readable discovery routes.

- [ ] **Step 1: Write failing publication tests**

```ts
expect(isPublishedStudy({ data: { draft: false } } as never)).toBe(true);
expect(isPublishedStudy({ data: { draft: true } } as never)).toBe(false);
expect(isPublishedStudy({ data: {} } as never)).toBe(false);
```

Add a discovery assertion that `/llms-full.txt` excludes every fixture marked `draft: true` by title, summary, and URL.

- [ ] **Step 2: Run focused tests and confirm the leak**

Run: `pnpm vitest run tests/unit/published-content.test.ts tests/unit/feed.test.ts`

Expected: the new helper test fails because the helper does not exist.

- [ ] **Step 3: Implement the fail-closed helper and schema**

```ts
export function isPublishedStudy(entry: CollectionEntry<"studies">): boolean {
  return entry.data.draft === false;
}

export async function getPublishedStudies(): Promise<CollectionEntry<"studies">[]> {
  return getCollection("studies", isPublishedStudy);
}
```

Change the schema to `draft: z.boolean().default(true)` and route every public consumer through `getPublishedStudies()`.

- [ ] **Step 4: Verify publication behavior**

Run: `pnpm vitest run tests/unit/published-content.test.ts tests/unit/feed.test.ts && pnpm run build`

Inspect: `rg -n "Termsly|three-products-one-privacy-stance|locked-delay" dist/llms-full.txt dist/sitemap-*.xml dist/feed*` must return no draft content.

---

### Task 2: Generate Optional Identity and Current Metadata

**Files:**

- Create: `scripts/public-metadata.mjs`
- Create: `src/pages/llms.txt.ts`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `src/lib/social.ts`
- Modify: `src/consts.ts`
- Modify: `src/components/Head.astro`
- Modify: `src/components/JsonLd.astro`
- Modify: `public/_headers`
- Modify: `public/humans.txt`
- Modify: `public/site.webmanifest`
- Modify: `scripts/og.sh`
- Delete: `public/llms.txt`
- Delete: `public/.well-known/atproto-did`
- Replace: `public/favicon.ico`
- Test: `tests/unit/public-metadata.test.ts`
- Test: `tests/unit/social.test.ts`
- Test: `tests/e2e/metadata.spec.ts`
- Test: `tests/e2e/optional-bluesky.spec.ts`

**Interfaces:**

- Produces: `normalizeSocialHandle(value): string | null`
- Produces: `writeOptionalPublicMetadata({ publicDir, blueskyDid }): Promise<void>`
- Consumes `BLUESKY_HANDLE` and `BLUESKY_DID` at build time.

- [ ] **Step 1: Write failing identity-generation tests**

```ts
await writeOptionalPublicMetadata({ publicDir, blueskyDid: "" });
expect(existsSync(join(publicDir, ".well-known/atproto-did"))).toBe(false);

await writeOptionalPublicMetadata({ publicDir, blueskyDid: "did:plc:abc123" });
expect(readFileSync(join(publicDir, ".well-known/atproto-did"), "utf8")).toBe("did:plc:abc123\n");
```

Assert malformed DIDs fail and blank identity values emit no optional public identity.

- [ ] **Step 2: Confirm current metadata failures**

Run: `pnpm vitest run tests/unit/public-metadata.test.ts tests/unit/social.test.ts`

Expected: generator tests fail against the currently unconditional public identity.

- [ ] **Step 3: Implement optional identity generation**

Export the generator from `scripts/public-metadata.mjs`, execute it before Astro, and remove a previously generated DID file whenever the variable is blank. Accept only `did:plc:` and `did:web:` values. Keep configured profile links independent from DID publication.

- [ ] **Step 4: Replace stale public metadata**

Generate `/llms.txt` from `products.json` and current site constants. Update humans, manifest, Open Graph colors/copy, colophon version, canonical hreflang URLs, and conditional JSON-LD identity. Produce a valid multi-size ICO from the existing section-sign artwork.

- [ ] **Step 5: Verify configured and blank builds separately**

Run:

```bash
BLUESKY_HANDLE= BLUESKY_DID= pnpm run build
test ! -e dist/.well-known/atproto-did
! rg -n "bsky.app" dist
BLUESKY_DID=did:plc:abc123 pnpm run build
test "$(cat dist/.well-known/atproto-did)" = "did:plc:abc123"
file public/favicon.ico
```

---

### Task 3: Bound Micropub Input and Store Safe Markdown

**Files:**

- Create: `workers/shared/http.ts`
- Modify: `workers/shared/auth.ts`
- Modify: `workers/micropub/index.ts`
- Modify: `workers/shared/types.ts`
- Test: `tests/unit/micropub-worker.test.ts`
- Test: `tests/unit/worker-http.test.ts`

**Interfaces:**

- Produces: `readLimitedBody(request, maxBytes): Promise<string>`
- Produces: `fetchWithTimeout(input, init, timeoutMs): Promise<Response>`
- Produces: `normalizeCanonicalIdentity(value): string | null`
- Produces: `escapeMarkdownInput(value): string`

- [ ] **Step 1: Add failing boundary tests**

Cover missing and oversized content length, chunked bodies exceeding 64 KiB, malformed JSON, unsupported content type, invalid slug, HTML/JSX input, malformed `me`, noncanonical `me`, IndieAuth timeout, and GitHub timeout.

```ts
expect(escapeMarkdownInput("<script>alert(1)</script>")).toBe("&lt;script>alert(1)&lt;/script>");
expect(normalizeCanonicalIdentity("https://hypertext.studio/")).toBe("https://hypertext.studio/");
```

- [ ] **Step 2: Run focused Worker tests**

Run: `pnpm vitest run tests/unit/micropub-worker.test.ts tests/unit/worker-http.test.ts`

Expected: new boundary cases fail against unbounded parsing and MDX output.

- [ ] **Step 3: Implement bounded parsing and exact authentication**

Read at most 65,537 bytes, reject over 65,536 bytes with `413`, accept only JSON or form encoding, and call all upstream services with an abort timeout. Normalize canonical identities to HTTPS origin plus `/`, rejecting credentials, query, fragment, non-root paths, and different hosts.

- [ ] **Step 4: Commit non-executable Markdown**

Write `${NOTES_PATH}/${slug}.md`, escape `<` in user-controlled Markdown, serialize frontmatter values with JSON-compatible scalars/arrays, and return `502` for GitHub API failure without exposing response bodies or secrets.

- [ ] **Step 5: Verify Micropub**

Run: `pnpm vitest run tests/unit/micropub-worker.test.ts tests/unit/worker-http.test.ts && pnpm run typecheck:workers`

---

### Task 4: Prevent Webmention Storage Abuse

**Files:**

- Modify: `workers/webmention/index.ts`
- Modify: `workers/shared/types.ts`
- Modify: `workers/shared/d1-schema.sql`
- Test: `tests/unit/webmention-worker.test.ts`
- Test: `tests/unit/worker-http.test.ts`

**Interfaces:**

- Consumes: shared bounded-body and timeout helpers from Task 3.
- Produces: `normalizeTarget(value): string | null`
- Produces: `verifyTargetExists(target): Promise<boolean>`

- [ ] **Step 1: Add failing abuse tests**

Cover bodies larger than 8 KiB, non-form bodies, HTTP targets, credentials, query/fragment aliases, nonexistent target pages, duplicate pending rows, oversized source pages, source timeout, and failed-verification deletion.

- [ ] **Step 2: Run the Webmention test file**

Run: `pnpm vitest run tests/unit/webmention-worker.test.ts tests/unit/worker-http.test.ts`

Expected: target-existence, deduplication, and cleanup assertions fail.

- [ ] **Step 3: Validate before persistence**

Require `application/x-www-form-urlencoded`, read at most 8 KiB, canonicalize target URLs, perform a time-bounded target GET, and check for an existing pending or verified source-target pair received within the last hour before inserting.

- [ ] **Step 4: Delete failed transient rows**

Keep asynchronous source verification. On any fetch, size, link, or parse failure, execute:

```sql
DELETE FROM webmentions
WHERE source = ?1 AND target = ?2 AND status = 'pending'
```

Only verified mentions remain available for moderation and listing.

- [ ] **Step 5: Verify Webmention behavior**

Run: `pnpm vitest run tests/unit/webmention-worker.test.ts tests/unit/microformats.test.ts && pnpm run typecheck:workers`

---

### Task 5: Add Versioned D1 Migrations and Workerd Tests

**Files:**

- Create: `migrations/0001_create_webmentions.sql`
- Create: `vitest.workers.config.ts`
- Create: `tests/workers/www.test.ts`
- Create: `tests/workers/poem.test.ts`
- Create: `tests/workers/webmention.test.ts`
- Create: `tests/workers/micropub.test.ts`
- Create: `tests/workers/oembed.test.ts`
- Modify: `wrangler.toml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `workers/shared/types.ts`
- Delete: `workers/shared/d1-schema.sql`

**Interfaces:**

- Produces: `pnpm test:workers` as the common runtime-test command.
- Produces: generated `worker-configuration.d.ts` checked by `typecheck:workers`.

- [ ] **Step 1: Install the current Workers test integration**

Run: `pnpm add -D @cloudflare/vitest-pool-workers`

Keep Vitest on the existing compatible 4.1 release.

- [ ] **Step 2: Add one workerd configuration per Wrangler environment**

Use `cloudflareTest({ wrangler: { configPath: './wrangler.toml', environment: '<name>' } })` and include only the matching `tests/workers/<name>.test.ts` file in each Vitest project.

- [ ] **Step 3: Write failing runtime route tests**

Each test calls `SELF.fetch()` and proves the environment entry point returns the correct 404/method/config behavior. Webmention uses a local D1 binding and applies `migrations/0001_create_webmentions.sql` before assertions.

- [ ] **Step 4: Configure runtime and types**

Set `compatibility_date = "2026-08-22"`, the newest date supported by the pinned workerd runtime; enable observability for every deployed environment, set `migrations_dir = "migrations"` on the D1 binding, generate Wrangler binding declarations, and include them in Worker TypeScript.

- [ ] **Step 5: Verify all Worker layers**

Run: `pnpm run test:workers && pnpm run typecheck:workers`

Dry-run: `for worker in www poem webmention micropub oembed; do pnpm exec wrangler deploy --env "$worker" --dry-run --outdir ".wrangler/dry-run/$worker"; done`

---

### Task 6: Establish the Portable CI Contract

**Files:**

- Create: `.github/dependabot.yml`
- Create: `tests/unit/ci-config.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/codeql.yml`
- Delete: `.github/workflows/deploy-pages.yml`
- Delete: `.github/workflows/deploy-workers.yml`
- Modify: `Makefile`
- Modify: `package.json`
- Create: `scripts/smoke.sh`

**Interfaces:**

- Produces: `make ci`, `make test-workers`, `make smoke BASE_URL=...`, and `pnpm test:workers`.
- Consumes: a single `dist` artifact named `site-${GITHUB_SHA}`.

- [ ] **Step 1: Write failing workflow-policy tests**

Read workflow YAML as text and assert:

```ts
expect(ci).toContain("permissions:\n  contents: read");
expect(ci).toContain("environment: production");
expect(ci).toContain("download-artifact");
expect(ci).toContain("bash scripts/migrate-d1.sh remote hypertext-studio");
expect(ci).toContain("bash scripts/smoke.sh");
expect(ci).not.toMatch(/uses: [^\n]+@(v|main|master)/);
```

Assert there is no production deployment job in any pull-request-only path and no legacy deploy workflow remains.

- [ ] **Step 2: Resolve and pin action SHAs**

Resolve the release tags for `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact`, and `github/codeql-action`. Record the semantic release in comments while `uses:` references the full 40-character SHA.

- [ ] **Step 3: Consolidate validation and release**

Keep parallel quality, unit/runtime, browser, and build jobs. The build job uploads `dist`. A single production job runs only on `main` push or authorized `workflow_dispatch`, downloads `dist`, applies remote D1 migrations, deploys all five Workers from source, deploys the downloaded Pages artifact, then runs smoke checks.

Use default read-only permissions, `production` environment protection, workflow/ref concurrency, cancellation for validation, and non-cancelable deployment. Do not use path filters for release completeness.

- [ ] **Step 4: Add dependency update and command contracts**

Configure weekly Dependabot updates for `npm` and `github-actions`. Add the same high-level command names intended for other repositories, with website-specific implementations delegated to package and shell scripts.

- [ ] **Step 5: Verify workflow policy**

Run: `pnpm vitest run tests/unit/ci-config.test.ts && make ci`

---

### Task 7: Repair Local Build, Development, and Deployment Commands

**Files:**

- Modify: `scripts/dev.sh`
- Modify: `scripts/build.sh`
- Modify: `scripts/deploy.sh`
- Modify: `scripts/bootstrap.sh`
- Modify: `scripts/doctor.sh`
- Modify: `Makefile`
- Modify: `package.json`
- Test: `tests/unit/build-scripts.test.ts`
- Test: `tests/unit/bootstrap.test.ts`

**Interfaces:**

- Produces: one build owner (`scripts/build.sh`).
- Produces: root-level `pnpm exec wrangler dev --env <name>` for all five Workers.
- Produces: explicit `deploy-preview` and `deploy-break-glass` commands.

- [ ] **Step 1: Add failing command-contract tests**

Assert the dev script includes `www` and passes every environment explicitly from the repository root. Assert package build does not invoke a prebuild hook and `scripts/build.sh` invokes `pnpm exec astro build` exactly once. Assert no Make target references nonexistent `scripts/release.sh`.

- [ ] **Step 2: Repair `dev-all`**

Launch each Worker with:

```bash
pnpm exec portless "$worker" pnpm exec wrangler dev --env "$worker"
```

Run from repository root, track child PIDs, and stop every process on exit.

- [ ] **Step 3: Remove duplicate build ownership**

Make `pnpm build` call `scripts/build.sh`; make the script run identity/optional metadata/OG generation once followed by `pnpm exec astro build`. Remove word-count/page-count machinery and recursive Make prerequisites.

- [ ] **Step 4: Make deployment explicitly manual**

Remove `release`, `deploy-prod`, and ambiguous automated-sounding targets. Retain named preview and break-glass commands that print a warning, build once, apply migrations before Workers, deploy Pages and Workers, and run smoke checks.

- [ ] **Step 5: Apply versioned migrations in bootstrap**

Replace direct schema execution with the shared legacy-safe `scripts/migrate-d1.sh` runner, preserving idempotent discovery and the existing value-by-value credential instructions.

- [ ] **Step 6: Verify scripts**

Run: `pnpm vitest run tests/unit/build-scripts.test.ts tests/unit/bootstrap.test.ts && bash -n scripts/*.sh scripts/lib/*.sh`

Start `make dev-all`, verify all six local processes reach ready output, then interrupt and verify they exit.

---

### Task 8: Remove Dead Code and Reconcile Documentation

**Files:**

- Delete: `src/components/CommandPalette.astro`
- Delete: `src/components/HoverCard.astro`
- Delete: `src/components/ProductDialog.astro`
- Delete: `src/components/ProductEntry.astro`
- Delete: `src/components/ShortcutSheet.astro`
- Delete: `src/components/StatusBar.astro`
- Delete: `src/components/Thesis.astro`
- Delete: unused files under `src/components/Footer/`
- Delete: `src/scripts/hovercard.ts`
- Delete: `src/scripts/keyboard.ts`
- Delete: `src/scripts/main.ts`
- Delete: `src/scripts/status-panel.ts`
- Delete: `src/data/palette.json`
- Delete: `public/img/curfew.svg`
- Delete: `public/img/logdate.svg`
- Delete: `public/img/termsly.svg`
- Delete: `scripts/words.sh`
- Modify: `src/layouts/Base.astro`
- Modify: all pages passing `sourcePath`
- Modify: `src/i18n/en.json`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/content.md`
- Modify: `docs/deployment.md`
- Modify: `docs/indieweb.md`
- Modify: `docs/mission.md`
- Modify: `docs/operations.md`
- Test: affected Playwright files under `tests/e2e/` and `tests/a11y/`

**Interfaces:**

- Removes: unused `sourcePath`, status-panel, command palette, hover-card, and word-count contracts.
- Preserves: current Header, Footer, product cards, ASCII artwork, theme, focus treatment, and permalink behavior.

- [ ] **Step 1: Prove every deletion is unreachable**

Run `rg` for every candidate filename, exported selector, imported module, and public asset path. Remove only files with no current production consumer; update or retain anything still reachable.

- [ ] **Step 2: Delete dead implementation and stale tests**

Use targeted file deletion. Remove test cases that exclusively specify deleted interactions, while retaining general keyboard, focus, accessibility, footer, and product behavior.

- [ ] **Step 3: Prune stale strings and documentation**

Remove Termsly from current public data and general site documentation while leaving unpublished historical draft sources intact. Reconcile company facts with the founder/about copy, describe five Workers, versioned migrations, one CI owner, optional identity, and current commands. Remove pretentious or obsolete mission claims not reflected by the approved company site.

- [ ] **Step 4: Verify the remaining surface**

Run: `pnpm run lint && pnpm run typecheck && pnpm run build`

Run reference audit: `rg -n "Termsly|CommandPalette|StatusPanel|sourcePath|PUBLIC_WORD_COUNT|release.sh|all four workers" README.md docs src public scripts Makefile` should return only intentional unpublished study references.

---

### Task 9: Full Release Verification and Review

**Files:**

- Modify only files required by failures proven in this task.

**Interfaces:**

- Produces: a locally verified commit ready for explicit publication authorization.

- [ ] **Step 1: Run static and unit gates**

Run:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run typecheck:workers
pnpm run test
pnpm run test:workers
```

- [ ] **Step 2: Run production build and artifact inspection**

Run `pnpm run build`, inspect optional identity and draft exclusions, and serve `dist/` with a no-write static server if Astro preview is blocked by disk pressure.

- [ ] **Step 3: Run all browsers and accessibility tests**

Run: `pnpm run test:e2e:all`

Any browser binary or filesystem blocker must be reported separately from product failures.

- [ ] **Step 4: Dry-run all deployments**

Run Wrangler dry-run for `www`, `poem`, `webmention`, `micropub`, and `oembed`; do not deploy.

- [ ] **Step 5: Review the complete diff**

Inspect `git diff origin/main...HEAD`, verify no secrets or unrelated files are included, and request an independent reviewer to check security, correctness, CI portability, and missing regression coverage.

- [ ] **Step 6: Commit the implementation**

Use the repository-required atomic reset/stage/commit chain, stage only intended paths, and include:

```text
Co-authored-by: Codex <codex@openai.com>
```

- [ ] **Step 7: Report readiness honestly**

Report local and CI-equivalent evidence separately from unperformed production deployment, DNS, credentials, and smoke checks. Do not claim the live site changed until publication is explicitly authorized and verified.
