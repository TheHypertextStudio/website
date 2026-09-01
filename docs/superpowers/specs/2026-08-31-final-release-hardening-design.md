# Hypertext Studio Website Final Release Hardening Design

## Objective

Make the website repository safe to publish and straightforward to maintain without changing the approved public visual design. The release must publish only intended content, validate the exact artifact that reaches production, deploy through one automated production path, harden every public Worker boundary, and leave behind a CI shape that can be mirrored across Hypertext Studio repositories.

## Scope

This pass covers the Astro site, its generated metadata, Micropub and Webmention ingestion, the five Cloudflare Workers, D1 schema management, local development commands, GitHub Actions, deployment documentation, runtime verification, and removal of unreachable legacy code.

The following are outside this pass:

- Changing the approved visual identity, typography, product presentation, or copy direction.
- Publishing or pushing the finished changes. Local implementation and verification will stop before remote mutation.
- Centralizing CI in an organization-level workflow before the same contract has been proven in multiple repositories.
- Repairing external DNS for `williecubed.me`; the repository will retain the intentional link and report DNS as an external concern.

## Design Principles

1. **Fail closed.** Draft status, social identity, protocol identity, and deployment eligibility must require affirmative configuration.
2. **Build once.** CI builds one immutable site artifact from one commit; deployment consumes that artifact instead of rebuilding it.
3. **One automated production owner.** GitHub Actions is the sole automated release coordinator. Cloudflare hosts the application but does not separately rebuild the Git branch.
4. **Explicit trust boundaries.** Public Worker inputs are size-bounded, time-bounded, canonicalized, and stored only in safe formats.
5. **Portable CI contract.** Repository-specific behavior lives behind consistent project commands. Workflow policy is reusable without pretending every repository has the same stack.
6. **Observable releases.** A deployment is successful only after migrations, service deployment, and production smoke checks complete.
7. **No speculative infrastructure.** Shared organization workflows, paid rate-limiting products, and unused content machinery are omitted until justified.

## Publication Boundary

All public study consumers will use one `getPublishedStudies()` helper. The helper excludes any entry whose draft state is absent or true; publishing therefore requires `draft: false`. The collection schema will enforce that fail-closed default, and tests will cover the HTML routes, indexes, feeds, sitemap inputs, `llms.txt`, and `llms-full.txt`.

The build will fail if a public metadata generator bypasses the shared publication helper. Existing draft studies remain in source but must not appear by title, summary, URL, or body in any production artifact.

## Generated Public Identity and Metadata

Optional identities will have one configuration boundary:

- `BLUESKY_HANDLE` controls public Bluesky profile and syndication links.
- `BLUESKY_DID` controls creation of `/.well-known/atproto-did`. No configured DID means no generated file.
- `TWITTER_HANDLE` controls Twitter card account metadata. No configured handle means those tags and JSON-LD identity entries are absent.

Build-time generators will own optional files so stale files cannot survive from `public/`. Static metadata will be reconciled with the actual product list, current tagline, Astro version, theme colors, organization facts, and current technology. The favicon will have valid file contents for its declared type, canonical `hreflang` URLs will use the current page, and the web manifest and Open Graph images will use the current design tokens.

## Worker Trust Boundaries

### Micropub

Micropub will:

- Reject request bodies larger than 64 KiB before parsing.
- Enforce request and upstream fetch timeouts.
- Require an exact canonical `me` identity match after URL normalization.
- Validate supported content fields and reject malformed or unsupported payloads.
- Commit generated posts as non-executable Markdown, never MDX.
- Escape or encode input that could become an executable HTML/JSX construct.
- Produce stable, collision-resistant filenames and actionable protocol errors.

Authenticated publishing remains supported; the design changes only how untrusted input is bounded and represented.

### Webmention

Webmention will:

- Accept only canonical HTTPS targets on the configured site origin.
- Confirm that the target resolves to a real public page before persistence.
- Bound request bodies and upstream source fetches.
- Reject duplicate pending submissions within a bounded time window.
- Persist verified mentions; failed verification removes transient pending data instead of accumulating permanent rejected rows.
- Keep moderation state for verified mentions without exposing unbounded unauthenticated storage.

The existing asynchronous response model remains, but all temporary rows receive deterministic cleanup.

### Worker Runtime

Wrangler environments remain the source of Worker names, routes, and bindings. Compatibility dates will be current and observability enabled. Generated Worker types will replace handwritten binding declarations where Wrangler supports them. Unit tests will continue to cover pure logic, while a workerd-backed Vitest layer will prove bindings, routing, limits, and response behavior in the actual Workers runtime.

## Database Migrations

D1 schema changes will be versioned under a migrations directory and applied with Wrangler before Worker deployment. Bootstrap creates or discovers the database, then applies the same versioned migrations used by CI. Documentation will distinguish local and remote migration commands explicitly.

The initial migration will represent only the schema used by production. Unused tables will be removed from the baseline rather than retained speculatively.

## CI Contract to Mirror Across Repositories

The repository will expose consistent entry points for install, format checking, linting, type checking, unit tests, runtime tests, browser tests where applicable, production build, and smoke checks. GitHub Actions orchestrates these commands but does not hide business logic in YAML.

The portable workflow policy is:

- Default `contents: read` permissions, with additional permissions granted only to the job that requires them.
- External actions pinned to immutable commit SHAs, with automated dependency updates configured for GitHub Actions and package dependencies.
- Concurrency groups include workflow and ref. Pull-request validation may cancel superseded runs; production deployment never cancels in progress.
- Pull requests receive no production credentials and cannot deploy production.
- Dependency caches are keyed by the lockfile and writable only from trusted events.
- The build job uploads the exact immutable artifact consumed by deployment jobs.
- Deployment jobs use a protected `production` environment and run only for `main` pushes or an explicit authorized dispatch.
- Database migration precedes Worker deployment. Pages and Workers deploy from the same commit, followed by service-specific production smoke checks.
- Path filters do not decide production completeness; changes to lockfiles, shared configuration, or generators cannot silently skip an affected service.
- CodeQL remains an independent security workflow because its schedule and permissions differ from release CI.

For this repository, one release workflow replaces the duplicated CI, Pages verification, and Workers verification pipelines. The workflow may parallelize independent validation jobs, but each check runs once per commit. A local explicit Wrangler deployment command remains documented as a break-glass procedure, not an automated second owner.

This contract is intended to be copied to other Hypertext Studio repositories by preserving the policy and command names while changing only stack-specific setup and deployment jobs. Once at least two additional repositories use the contract successfully, organization-owned reusable workflows can centralize proven common steps without locking unlike projects into a premature abstraction.

## Local Developer Experience

`make dev-all` will start the Astro site and all five Wrangler environments from the repository root with explicit environment names. It will use the repository-pinned Wrangler dependency and terminate all children cleanly.

Build hooks will have one owner. `pnpm build`, `make build`, preview, audit, and deployment will not recursively regenerate the same content or rebuild the site. Broken release automation will be removed; the documented release action is merging to `main` and observing the production workflow.

## Cleanup

Unreferenced components, scripts, raster/vector assets, status-panel word-count machinery, obsolete product references, and documentation for removed interactions will be deleted. Shared layout props and generated data that no current consumer reads will be removed. Cleanup is guarded by reference searches, type checking, build output inspection, and browser tests.

User-owned untracked `.superpowers/` state and existing planning documents will not be modified except for this new spec and its corresponding plan.

## Error Handling and Rollback

Validation failure prevents deployment. Migration failure prevents Worker and Pages deployment. Worker or Pages deployment failure prevents the release from being marked successful. Smoke-test failure makes the run visibly failed and provides the exact endpoint and status, without automatically attempting a destructive rollback.

The break-glass document will identify the prior successful Git commit and show explicit artifact rebuild, Wrangler deployment, and smoke commands. Rollback remains a deliberate operator action because the release spans static content, Workers, and a forward-only database.

## Verification

The implementation is complete only when all of the following pass from a clean checkout:

- Formatting, ESLint, Astro diagnostics, site TypeScript, and generated Worker types.
- Unit tests for draft filtering, optional identity generation, metadata, bootstrap, Micropub, Webmention, and build orchestration.
- Workerd-backed tests for every Worker environment and binding-sensitive path.
- Production build inspection proving drafts, absent identities, stale product references, and invalid protocol files are not emitted.
- Chromium, Firefox, and WebKit browser suites, including responsive and accessibility coverage.
- Local `make dev-all` startup and shutdown across the site and all five Workers.
- Workflow syntax and static policy checks for permissions, immutable action pins, triggers, concurrency, artifacts, migrations, and smoke jobs.
- A dry-run deployment bundle for every Wrangler environment.
- A final independent code review of the resulting diff.

Production health after publication is a separate acceptance step because local and CI verification cannot prove provider credentials, DNS, or the live deployment without performing the authorized release.
