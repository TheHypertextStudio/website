# Hypertext Studio Website Standardization Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking. Implementation and production promotion are separate operations.

**Goal:** Standardize configuration, setup, and documentation across Hypertext Studio websites, move company/marketing/application frontends onto Cloudflare Workers, and retain Mintlify as the shared product documentation platform.

**Architecture:** Use Astro for standalone marketing and company sites, Next.js App Router for the existing LogDate and Docket applications, and Mintlify for product documentation. Each product keeps its repository, domains, backend services, and independently deployable components. Shared configuration, setup conventions, frontend packages, and Mintlify tooling live in a new `TheHypertextStudio/web-platform` repository; Workers deployment and promotion extend `TheHypertextStudio/release-engineering`.

**Tech Stack:** TypeScript, React where interaction requires it, Astro, Next.js App Router, Mintlify with MDX, pnpm, Cloudflare Workers Static Assets, GitHub Actions, Vitest, and Playwright. Use the official Astro Cloudflare adapter for server rendering and OpenNext for the existing Next.js apps.

**Spec:** The decisions, contracts, migration tasks, and acceptance criteria in this document form the implementation specification.

## Decisions and boundaries

- The framework split is a planning assumption based on the Astro discussion. This standard supports two frontend profiles. It does not achieve one framework across every website.
- Astro is the default for new standalone company and marketing websites. React islands handle richer controls. Existing marketing routes inside LogDate and Docket remain in their Next.js apps during this migration to preserve routing and authentication continuity.
- Mintlify remains the product documentation platform and is the default when adding docs for another Studio product. Standardize its configuration, setup, authoring guidance, checks, and publishing conventions. Preserve its hosted rendering, search, components, and authoring tools. This migration does not require creating new product documentation sites.
- Company, marketing, and application frontends ultimately run on Workers. Mintlify-hosted documentation is an explicit exception. An incompatible application remains on its current host until its compatibility gate passes; a successful static-site migration does not count as completion for that application.
- Preserve current public domains, paths, redirects, search visibility, product branding, accessibility, and content. A brand redesign and a rewrite of product application behavior are outside this migration.
- Include Hypertext Studio, Curfew, LogDate, Docket, and Curfew/Docket documentation. Reasonable Tech, Lovelace, LVBT, internal Docket administration, native apps, and backend platform migrations are outside this plan.
- Keep backend APIs, databases, licensing, webhooks, scheduled jobs, and native distribution on their existing services. Preserve release ordering where those services are dependencies of a frontend.
- GitHub Actions remains the automated release owner for Workers frontends. Default-branch changes create candidates; production uses explicit promotion of an approved candidate through the existing release-engineering contract. Mintlify retains its Git-based publishing lifecycle, with required checks before merging to its configured deployment branch.
- Provider provisioning and domain changes are explicit operations. Pull request jobs receive no production credentials; preview workloads receive no production write credentials or databases.
- Do not create a company-wide Worker containing every site. Keep products isolated and preserve privileged service boundaries.

## Current systems and destinations

| Surface          | Current source and hosting                                 | Destination                                                                                       |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Hypertext Studio | `website`: static Astro on Pages; five supporting Workers  | Astro assets on a dedicated site Worker; retain the supporting Workers                            |
| Curfew marketing | `curfew/landing`: HTML on Pages                            | Astro marketing site on Workers                                                                   |
| Curfew docs      | `curfew/docs`: Mintlify MDX, proxied under `/docs`         | Keep Mintlify; adopt shared config/setup/checks and preserve the `/docs` proxy on Workers         |
| LogDate web      | `logdate-web/apps/web`: Next.js on Vercel                  | Existing Next.js application adapted with OpenNext on Workers                                     |
| Docket web       | `athena-web/apps/web`: Next.js on Vercel                   | Existing Next.js application adapted with OpenNext on Workers                                     |
| Docket docs      | `athena-web/apps/docs`: Mintlify MDX, served under `/docs` | Keep Mintlify; adopt shared config/setup/checks and preserve `/docs` routing through the frontend |

The inventory describes inspected source configuration. Task 1 verifies live provider ownership and routing before changing them. Current Curfew remote main uses `landing/` and `docs/`; its repository notes say the Mintlify source is unpublished. Reconcile the actual Mintlify project, Git source, and `/docs` delivery before changing routing. The divergent primary Curfew checkout remains untouched.

## Shared contracts

### Frontend foundations

Create `web-platform` with packages `@thehypertextstudio/web-config`, `@thehypertextstudio/web-tokens`, `@thehypertextstudio/web-ui`, and `@thehypertextstudio/web-docs`, plus Astro and Next.js reference applications. The package scope matches the GitHub organization that owns the registry.

- `web-config` owns TypeScript, ESLint, Prettier, and frontend acceptance configuration. Integrate existing repository governance rather than introducing competing hooks.
- `web-tokens` exports CSS variables for spacing, motion, focus, and semantic colors. Product themes supply their approved colors, typography, and artwork.
- `web-ui` exports accessible React controls and framework-independent CSS. Astro wrappers live with the Astro integration; Next.js wrappers live with the Next.js integration. A React component must not import either framework's router.
- `web-docs` supplies shared Mintlify configuration defaults, a configuration generator, validation commands, authoring guidance, and documentation templates. Mintlify supplies rendering and search. Product repositories own their MDX, navigation, URLs, and product-specific configuration.
- Publish versioned packages to GitHub Packages with read-only consumer access. Products pin exact versions; updates arrive in reviewed dependency changes. Publish packages through release-engineering's existing npm adapter.
- Adopt Node 24 and pnpm 11 as the shared major versions. Task 1 records exact compatible patch versions in the shared toolchain and product locks. Preserve framework versions during initial hosting migration; converge compatible patches in a separate dependency change.

### Configuration setup and documentation

- Give every site a declared framework profile, canonical origin, local development command, required environment variable names, provider bindings, and validation commands in its existing shared lifecycle configuration. Keep secret values out of repository files.
- Provide the same `./run setup`, `./run doctor`, `./run dev`, `./run check`, and `./run build` entrypoints across site repositories. Setup installs pinned tools and dependencies; doctor identifies missing configuration with actionable instructions. Provider provisioning remains a separate explicit operation.
- Standardize repository documentation around a README quickstart, environment/configuration reference, local development, CI/review, deployment, recovery, and troubleshooting. Maintain common instructions in `web-platform` and release-engineering; product documentation links to them and records product-specific facts.
- For Mintlify, consume a versioned shared base plus a product-owned `docs.site.json` beside the existing `docs.json`. Generate and commit the schema-valid `docs.json`; CI checks that regeneration produces no diff. Do not assume Mintlify has native configuration inheritance.
- The shared base owns schema selection, supported component conventions, common accessibility settings, and configuration validation. Product overrides own identity, approved theme/fonts/colors, domain/base path, logos, navigation, redirects, API sources, and product links. Replace product arrays as whole values; do not concatenate unrelated navigation or redirects.
- Expose the same commands at each docs-owning workspace root: `pnpm docs:config`, `pnpm docs:config:check`, `pnpm docs:dev`, and `pnpm docs:check`. Resolve each product's docs directory through configuration and use the same pinned Mintlify CLI through local dependencies.
- `docs:check` verifies generated configuration, MDX validity, navigation targets, local links/anchors, redirects, frontmatter, and accessibility. Retain additional product-specific coverage checks. The checked-in generated config lets Mintlify publish without installing private shared packages in its hosted builder.
- Standardize authoring guidance for overviews, quickstarts, guides, reference pages, and changelogs where relevant. Share terminology rules, component examples, link conventions, and contribution instructions; preserve product-specific information architecture and useful existing content.
- Keep each existing Mintlify project, repository source directory, deployment branch, domain, and `/docs` path. Record Git integration, contributor access, preview entitlement, and recovery instructions in the setup reference. Use hosted previews when the subscription supports them and the pinned local preview otherwise.
- Record reviewed source SHA and the Mintlify deployment result separately from Workers artifact digests. Do not claim that Mintlify promotes the same immutable frontend artifact or exposes the Workers release metadata endpoint.

### Workers build and release

Use existing `studio.yaml`, `studio.lock.json`, and `./run` interfaces. Extend the existing site deployment contract with `provider: workers`; retain the Pages and Vercel adapters for recovery and products outside this migration.

- Each website artifact contains prebuilt Worker modules where needed, static assets, reviewed routing/binding configuration, source SHA, dependency lock digest, toolchain versions, and artifact digests. Promotion must never run a framework build or resolve new dependencies.
- Support website-only candidate assembly in the website's repository without requiring a Mac application release. A coordinated product release can consume the same website artifact as a dependency.
- Build the shipping candidate once. Deploy those bytes to an isolated preview with a recorded environment overlay; promote the same digests with the reviewed production overlay. Record the overlay identity separately from the artifact identity.
- Build-time public configuration is part of the candidate. Changing embedded public URLs or other build inputs requires a new candidate. Staging-specific builds are never substituted for the reviewed shipping artifact.
- Add `GET /__studio/release` returning `sourceSha`, `artifactSha256`, and `candidateId`, with `Cache-Control: no-store`. The deployment injects this metadata after artifact hashing; do not create a self-referential artifact digest. Configure the Worker to handle this path before asset serving.
- Production promotion verifies artifact and configuration identities, reviewer evidence, required backend readiness, and the selected candidate's supersession state. Persist completed, partial, and failed operations; retries resume the same candidate.
- Keep the established lifecycle commands: `./run setup`, `doctor`, `dev`, `check`, `build`, `provision plan`, `provision apply`, `release inspect`, and `release promote`. Product scripts become thin delegates for shared release behavior.

### Motion and navigation

Shared element transitions are supported by the standard; adoption on each product screen is a separate UI change.

- Provide a reference sign-in interaction in both framework examples: a real sign-in URL, a button-to-panel transition, keyboard focus management, reduced motion, and usable behavior without the animation.
- Astro uses named view transitions with a single matching surface per view. Opt into the client router only where needed; reinitialize scripts through its navigation lifecycle.
- Next.js uses parallel/intercepting routes when sign-in must overlay the previous route while maintaining URL/history behavior. Keep the visual transition layer separate from the route contract.
- Direct visits and refreshes render a complete sign-in page; Back closes a route-backed overlay and Forward restores it. Same-page dialogs manage Escape, focus containment, background interaction, and focus restoration.
- Do not depend on animation support or cross-origin transitions for authentication. Keep experimental React or Next.js transition APIs out of the required production baseline.

## Review focus

- Production public URLs embedded at build time must not redirect preview acceptance into production writes; Tasks 2 and 7 check configuration and authentication isolation.
- A destination that still contains the original sign-in button must not reuse the panel's transition identity; Task 3 checks matching elements and direct navigation.
- Docs requests, assets, and redirects under `/docs` must not escape their prefix or recurse through the public hostname; Tasks 5 and 6 check route parity.
- Cached responses must not mix anonymous and authenticated users or survive invalidation incorrectly; Task 7 checks viewer isolation and revalidation.
- A rollback must restore compatible HTML, modules, assets, and routes together while preserving data; Tasks 2 and 8 exercise the recorded recovery target.

## Implementation tasks

### Task 1 Establish the migration inventory

**Owner:** Website migration workstream, with records in `release-engineering` documentation.

**Produces:** A component matrix containing repository, source path, framework/docs profile, current host, account/project identifiers, domains, routing rules, environments, secrets by name, bindings, backend dependencies, setup/check commands, documentation locations, current deployment identity, and rollback target.

- [ ] Inspect the live Cloudflare, Vercel, Mintlify, and GitHub configuration for the six surfaces above. Reconcile any difference from source before provisioning.
- [ ] Inventory all existing redirects, headers, auth callbacks, passkey relying-party IDs, association files, feeds, sitemaps, docs anchors, and public API endpoints. Capture representative successful behavior on the current hosts.
- [ ] Record the exact Node 24, pnpm 11, Wrangler, framework, and adapter pins; check compatibility without upgrading framework majors. Confirm each product's canonical domain from its current release configuration.
- [ ] Record current provider request/error/latency baselines and monthly usage so migration cost and regressions can be compared.

**Acceptance:** Every scoped surface has an owner, current provider identity, routing contract, dependency list, setup/documentation inventory, and recoverable release. Missing provider access is an explicit blocker for that surface.

### Task 2 Extend shared release engineering for websites

**Owner:** `release-engineering`; extend candidate schemas, assembly, site/Worker providers, reusable workflows, and their existing tests.

**Consumes:** The inventory and existing lifecycle contracts. **Produces:** Immutable website candidates and Workers promotion through the same lifecycle API.

- [ ] Add contract tests for Workers assets and application modules, website-only assembly, digest/configuration mismatch rejection, superseded approval rejection, failed-operation resume, and missing environment bindings.
- [ ] Implement `provider: workers` for prebuilt website artifacts. Preserve the existing standalone Worker adapter and backward-compatible Pages/Vercel behavior.
- [ ] Implement isolated previews, explicit configuration overlays, release metadata, and promotion without rebuilding. Provisioning and secret values stay outside build artifacts.
- [ ] Treat Mintlify documentation as an external publishing integration: verify source checks and record the provider deployment result without running a Workers build, replacing Mintlify's renderer, or claiming artifact-promotion guarantees the provider does not offer.
- [ ] Record previous Worker versions and route/domain bindings before cutover. Recovery restores the prior complete site release and routing state; database migrations remain forward compatible.
- [ ] Exercise static Astro and Next.js fixture candidates through preview, promotion, failed probe, retry, and rollback using test provider resources.

**Acceptance:** Preview and production records identify identical shipping artifact digests; altered bytes or unbound evidence fail before publication. Restoring the prior candidate restores matching HTML, application modules, and assets.

### Task 3 Publish the shared frontend foundation

**Owner:** New `web-platform` repository.

**Consumes:** The lifecycle from Task 2. **Produces:** The four versioned packages and two reference apps described above.

- [x] Implement shared configuration, tokens, controls, Mintlify config generation/validation, setup tooling, and repository/authoring documentation templates.
- [x] Add configuration fixtures for Curfew and Docket. Verify product overrides preserve navigation, redirects, branding, and base paths; generated config is deterministic and stale generated files fail `docs:config:check`.
- [x] Build the Astro and Next.js examples with product theme overrides. Keep interactive React islands optional for Astro content pages.
- [x] Implement the sign-in motion examples with URL/history, direct-navigation, keyboard, reduced-motion, and animation-fallback scenarios.
- [ ] Publish an initial immutable package release. Prove clean consumer installation and builds in both framework profiles using scoped read-only package access.

**Acceptance:** Both reference apps consume the same package release and pass the shared accessibility/navigation scenarios. Curfew and Docket config fixtures pass the same docs commands. Product themes retain their own typography and appearance; a fresh checkout can follow the shared setup and documentation without a global Mintlify installation.

### Task 4 Migrate the Hypertext Studio website

**Owner:** `website`; update the current Astro deployment, workflow, provisioning, and operational documentation.

- [ ] Adopt shared frontend configuration and the release lifecycle. Serve the existing static Astro output from Workers Static Assets with a minimal handler for release metadata.
- [ ] Adopt the common setup/doctor entrypoints and update the README, configuration reference, development, deployment, and recovery instructions to match the actual lifecycle.
- [ ] Retain `www`, poem, webmention, Micropub, and oEmbed as separate Workers during migration. Replace their use of Wrangler environments as component names with independent component configurations; environments represent staging and production.
- [ ] Preserve the existing D1 database and data. Keep Micropub's GitHub write token isolated from the site Worker and previews.
- [ ] Verify path/query-preserving canonical redirects, all IndieWeb endpoints, publication boundaries, association files, custom 404s, cache headers, feeds, and sitemaps on the candidate.
- [ ] Promote the candidate and switch the apex hosting route using the Task 2 cutover process. Replace Pages commands in the normal release and break-glass documentation with candidate-based recovery.

**Acceptance:** Production identifies the approved candidate and existing public/protocol behavior remains functional. Unknown URLs remain 404s; no general SPA fallback is introduced.

### Task 5 Migrate Curfew marketing and standardize its documentation

**Owner:** `curfew`; convert `landing` to Astro and retain `docs` as the Mintlify source directory.

- [ ] Preserve landing content and product appearance while replacing raw HTML with Astro layouts and shared foundations.
- [ ] Add the shared Mintlify base, product config, generated `docs.json`, pinned CLI, and standard docs commands. Preserve existing MDX components, navigation, code examples, URLs, anchors, and licensing/MCP/CLI coverage.
- [ ] Port the Pages `/docs` proxy to the Workers frontend while keeping the existing Mintlify project and upstream. Preserve path/query/forwarded-origin handling, asset delivery, redirects, and canonical URLs.
- [ ] Document checkout setup, local site/docs previews, configuration overrides, required checks, Git integration, publishing, and recovery using the shared templates.
- [ ] Keep licensing and download APIs on their current services. Verify links and error behavior without issuing or mutating real licenses during preview checks.
- [ ] Promote the marketing frontend through the shared lifecycle. Verify public landing and download links, then verify the existing Mintlify docs routes, search, and assets through the new proxy.

**Acceptance:** Curfew marketing runs on Workers, docs remain on Mintlify under the same URLs, and shared config/setup/docs checks work from a fresh checkout.

### Task 6 Standardize Docket documentation on Mintlify

**Owner:** `athena-web/apps/docs`, with frontend routing changes in the same repository.

- [ ] Adopt the shared Mintlify base, product config, generated `docs.json`, pinned CLI, and common docs commands. Keep MDX, existing components, navigation, redirects, heading anchors, product branding, and content coverage checks.
- [ ] Retain the existing Mintlify project and Git integration. Preserve the Vercel `/docs` rewrite during the interim phase and port its behavior to the Workers frontend during Task 7.
- [ ] Keep the existing asset-routing contract and canonical public origin. Forward docs traffic to the explicit Mintlify upstream; never recursively fetch the public frontend hostname. Verify HTML, static assets, search, and redirect destinations under the configured base path.
- [ ] Preserve the API-owned Scalar reference at `/v1/docs`. Keep the existing docs navigation, vocabulary, OAuth, MCP coverage, local-link, and accessibility checks as release gates.
- [ ] Standardize setup, authoring, preview, configuration, publishing, and recovery instructions. Require common docs checks before merging to the configured deployment branch and record the Mintlify deployment for the reviewed source SHA.

**Acceptance:** Docket remains on Mintlify, existing docs routes/search/assets work, shared configuration and commands match Curfew's setup, and the API-generated reference remains functional.

### Task 7 Migrate LogDate and Docket applications

**Owner:** Each application repository, with shared OpenNext integration in release-engineering. Complete LogDate first, then Docket.

- [ ] Produce a compatibility record for each pinned Next.js/OpenNext pair. Cover server components, server actions, route handlers, streaming, cache components, revalidation, images, middleware, workspace transpilation, redirects, and headers actually used by that application.
- [ ] Adapt the existing `next build` output with OpenNext and package its modules, assets, cache requirements, and binding configuration. Keep vinext outside this migration because it changes the execution implementation and is currently beta.
- [ ] Replace Vercel-specific hosting configuration and telemetry with the shared Workers equivalents. Preserve CSP, image formats/caching, service-worker freshness, native association documents, and same-origin API/auth proxies.
- [ ] Adopt the shared setup/configuration entrypoints and repository documentation templates. Keep Docket's Mintlify integration external to its application artifact and preserve its docs proxy behavior.
- [ ] For LogDate, exercise account/session flows, passkeys, public profiles/journals/notes/rewind, waitlist delivery, and internal revalidation. Verify private and viewer-dependent responses never enter public caches.
- [ ] For Docket, exercise sign-in, session refresh/logout, API/auth forwarding, streaming product screens, legacy redirects, native/passkey associations, and docs delegation. Preserve backend migration/readiness checks before frontend promotion.
- [ ] Use isolated test accounts and staging backend resources for preview authentication. Preview-host passkeys use the staging relying-party configuration; existing production passkeys require a controlled check on the canonical production origin after cutover.
- [ ] Promote each application only after its compatibility and provider acceptance gates pass. If an adapter limitation remains, record the failing behavior and keep that application's current production host until resolved.

**Acceptance:** Each application passes its existing functional suite plus Workers runtime acceptance, then completes authenticated production checks on its unchanged canonical origin. A landing-page HTTP 200 is insufficient.

### Task 8 Complete cutover and retire duplicate hosting

**Owner:** Each product repository using the shared promotion process.

- [ ] Standardize Mintlify configuration/setup independently of hosting cutovers. Roll out Workers hosting in this order: Hypertext Studio, Curfew marketing, LogDate web, Docket web. Require 24 hours of observation after each production change before beginning the next cutover.
- [ ] Immediately compare Workers production release metadata with the approved manifest. Verify critical journeys, redirects, association files, Mintlify proxy delivery, and provider errors; restore the recorded prior route/release if critical behavior fails. Verify Mintlify config/content changes through its separate deployment record.
- [ ] Monitor availability, error rate, latency, authentication failures, cache behavior, and usage against Task 1 baselines. Investigate sustained regressions before retiring the previous host.
- [ ] Retain the old Pages/Vercel deployment and recovery configuration for 14 days after each successful hosting cutover. Disable automatic publication on the old frontend host at cutover so it cannot compete with the new release owner. Keep Mintlify publishing active.
- [ ] After the retention period and completed acceptance, remove obsolete Pages/Vercel deployments, provider secrets, and integrations where unused. Retain Mintlify projects, subscriptions, and required docs proxies. Reconcile the inventory and update setup, deployment, incident, and rollback documentation.

**Acceptance:** All four company/marketing/application frontends use Workers; Curfew and Docket docs remain on Mintlify with the shared configuration/setup/documentation standard. Product repositories use the shared lifecycle and frontend foundations, and obsolete frontend hosts are retired. No unresolved application migration exception is counted as complete.

## Verification and completion

The following are implementation acceptance requirements, not checks performed while drafting this plan.

| Area                    | Required evidence                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared release          | Altered digest, changed configuration, stale authorization, retry, partial failure, and rollback scenarios; no build during promotion                                                |
| Runtime                 | Production-like `workerd` checks against packaged artifacts, followed by isolated provider previews                                                                                  |
| Content                 | URL/status/redirect parity, docs anchors and search, feeds/sitemaps/canonicals, draft exclusion, and correct 404s                                                                    |
| Configuration and setup | Deterministic Mintlify config generation, stale config rejection, product override preservation, identical docs commands, pinned local CLI, and fresh-checkout setup/doctor behavior |
| Documentation workflow  | Shared repository and authoring instructions, required checks before merge, Mintlify source/deployment records, and working `/docs` proxy delivery through Workers                   |
| Authentication          | Cookie/header forwarding, passkey origins, OAuth callbacks where used, refresh/logout, and no private-data cache leakage                                                             |
| Interaction             | Chromium, Firefox, and WebKit navigation; direct URL/refresh, Back/Forward, keyboard/focus, reduced motion, and animation unavailable                                                |
| Production              | Approved manifest and live metadata agree; authenticated critical journeys succeed on canonical domains; provider monitoring and recovery records are retained                       |

Completion requires every scoped surface to pass its gates, both Mintlify projects to adopt the common configuration/setup/documentation workflow, and the frontend hosting recovery retention to finish. Code completion, preview acceptance, production acceptance, and legacy frontend retirement must be reported separately.

## Implementation checkpoint: October 10, 2026

Tasks 1–3 are in progress; no task or production migration is complete.

- Shared `web-docs` tooling implements deterministic configuration generation, drift checks, pinned local Mintlify preview/validation commands, and repository/authoring templates. Twenty automated checks and the TypeScript build pass on Node 24.20.0 with pnpm 11.9.0.
- Shared `web-config` now supplies browser/Node TypeScript profiles, composable lint presets, Astro formatting, and a Chromium/Firefox/WebKit acceptance configuration. Seven additional consumer checks were observed failing before implementation; all 27 checks, typechecking, lint, and builds pass locally. A clean consumer installs the final packed config bytes and compiles, lints, formats Astro, and discovers the three browser projects. Rendered navigation/accessibility and registry installation remain separate pending gates.
- The packed package installs in a clean consumer checkout. Actual Curfew and Docket content passes Mintlify build validation, links/anchors/redirects/snippets, and accessibility. Curfew's docs primary color uses the user-approved `#b25e30`; existing marketing branding remains unchanged. This is local package acceptance, not registry publication or provider deployment acceptance.
- The release-engineering branch adds a prebuilt Workers site adapter, explicit account/environment/route isolation, complete release identity probes, and website-only candidate assembly coverage. Python and Swift checks pass locally. The follow-up guards module/file inputs and production resource isolation; hosted CI passes. Real framework previews and deployment of the identical ZIPs through the production overlay now pass on isolated test Workers. Hosted product promotion, recovery acceptance, and complete cutover route capture remain outstanding.
- Product repositories now have product-owned Mintlify configuration inputs. Root command/CI adoption awaits a verified shared package release; existing product checks remain required.
- Studio Cloudflare access is now available through the explicitly selected `cf` profile `hypertext-studio`. Read-only inspection captured both Pages production recovery deployments, the five supporting Workers' current/previous versions, D1 metadata, and frontend CNAMEs. Mintlify dashboard inspection confirms Docket's Git source and successful docs deployment; Curfew's existing project is unconnected and has no successful deployment. Curfew's public `/docs` remains the HTML guide; Docket's docs canonical tags still name the old Studio alias. These differences are recorded for reconciliation. Full route/binding capture, provider baselines, and authenticated product acceptance remain open; fixture previews are recorded below.
- Shared tokens, React controls, and both framework references now build locally. Astro passes 39 and Next.js passes 42 Chromium/Firefox/WebKit scenarios, covering native dialogs, focus, real sign-in URLs, direct visits/refresh, Back/Forward, reduced motion, and absent animation APIs. The Next.js example records real browser animations to check button-to-dialog growth and duration units. Astro's content-only route emits no scripts or islands. These are local framework checks, separate from Workers runtime/provider acceptance.
- The shared repository now delegates setup/doctor/dev/check/build to checksum-pinned release-engineering v0.1.6. Setup, doctor under the declared Node runtime, checks, and builds pass. CI runs both production-reference browser suites. Documentation records package use, framework boundaries, and the demonstration form's lack of an authentication backend.
- The pinned Mintlify CLI's missing matching ReactDOM dependency is reconciled with an exact package extension. Astro's Vite React plugin is pinned to its declared compiler peer. Peer checks pass without suppressed warnings; actual Curfew and Docket native Mintlify validation, links, and accessibility pass again with the reconciled graph.
- Initial immutable package publication and clean read-only registry consumers remain open. Task 3 is still in progress. Product adoption, Workers framework adaptations/previews, production rollout/observation, and old-host retention/retirement remain open.
- Native tarball inspection now checks exported UI files and every source-map target. The UI package includes the referenced sources; all 28 tooling checks and browser/Node test typechecks pass. A fresh consumer installs exact local config/tokens/UI tarballs without workspace source links, passes frozen installation and peer checks, and typechecks/builds both framework references. Registry access is still a separate pending gate. Hosted foundation CI passed at both `ca91879` and the packaging follow-up `b196586`.

### Runtime and provider checkpoint

- Real Astro 7.2.9 and Next.js 16.3.8/OpenNext 1.20.10 archives run in local `workerd` through Wrangler 4.148.0. Final native bundling happens during candidate creation. Independently extracted staging and production roots retain identical module/asset/archive bytes without rebuilding.
- Both isolated Cloudflare previews identify fixture source `942e651` and the expected archive digest/candidate ID. Astro passes custom 404, static asset, and script-free HTML checks. Next.js passes application-module byte comparison, cookie-dependent server rendering, private cache headers, route-handler cookie/query handling, assets, and 404s. Their recorded versions remain the original deployments after reconciliation. These are test resources, not migrated company frontends.
- The same retained ZIPs now pass the production overlay on two additional test Workers. Astro's deployment is `3c08cb0a-3ffc-4387-abf0-c847de5de617`, version `7122bfc6-51e3-4389-9ea8-ec3389d77488`; Next.js's deployment is `e6c88df6-541b-43bd-bb2d-6896985f33c7`, version `412fbc72-aa5f-445f-a529-bf3217296d32`. Archive and configuration digests match preview evidence. Astro HTML/assets and six Next.js modules per environment match archived bytes. Both environments reject an incorrect release digest and pass 404, cookie/query, viewer-isolation, and private-cache checks where applicable.
- Repeating the production-test operator acceptance reconciles the same deployments; cf still reports exactly one deployment per test Worker. Version settings confirm ASSETS, the three release metadata values, compatibility date/flags, and the shipping module. All four fixtures are retained for recovery exercises. These operator exercises do not provide hosted owner candidate admission or human product promotion authorization; complete release/routing recovery remains open.
- Fresh `cf` authentication completed through Chrome's Hypertext Studio profile and was verified against Studio account `2500680a3b2b0fe6a011c1c25fed5008`. The named CLI profile is activated for this worktree; provider requests still select it explicitly.
- A real Astro preview probe failed because Cloudflare rejected Python's generic user agent. A reproducing regression led to the explicit `Studio-Release-Probe/1.0` identifier; metadata, TLS, and size checks remain enforced. Next.js's first HTML request returned 404 after metadata succeeded; later reads passed. Both failed observations remain in the provider evidence and recovered without redeployment.
- Release-engineering `942e651` passes hosted push/PR CI, including credential-free Linux framework/workerd acceptance. Follow-up `bbc48c3` records the probe fix and provider evidence. All 136 Python tests, including both native suites, four Swift tests, workflow lint, and runtime assembly pass locally. The runtime SHA-256 is `23bff6025c6910d454aceea02716039b5420cc0858e068a2a50b8fc81ed83818`.
- Current OpenNext's declared peer range excludes LogDate's Next.js 16.2.4 pin. The new fixture uses a supported pair; product dependency preparation and compatibility gates remain required. Shared package publication, complete release/routing recovery, product adoption, production cutovers, observation, and old-host retirement remain open.

## Phase regroup and remaining work: October 10, 2026

Use one agent per independent task, with at most three task agents and one coordinator active together. Each phase ends with source review, integration checks, an evidence review, and reassignment of the available agents. Product implementation can proceed against reviewed local packages while publication is pending; registry and provider acceptance remain required before release.

The published lifecycle is v0.1.8 at `878260def7229cd3df7f752b32e5581230c5db2d`. Its hosted archive matches SHA-256 `61f746429fc0ffc7826df2bde61ee4d41323fb5fa0c9f8661255040e7838afd4`. This release adds scoped product roots, explicit Images bindings, retained native OpenNext R2 cache seeding, and reviewed credential, Node-selection, legacy-runtime and lazy variable-lookup fixes. The final local suite passed 200 Python checks with both native suites enabled; hosted framework/native verification and release run `38114478927` passed. Product consumers now target this published runtime; actual consumer and provider acceptance remain product-specific gates.

The initial shared frontend release is **0.0.1**, following the user's version decision. Publication of all four packages succeeded from approved candidate `38116243716-1`, manifest SHA-256 `097bb8cd7f4bb7341bb9bfdc48c79cc0c855a95c3b25a225374c1f9da3f58fa4`. The retained production release and fresh registry consumers independently match the shipping tarball integrity values. The prior 0.1.0 proposal remains unpublished. Product/native release versions were preserved. Studio is pinning its three shared tool peers exactly; LogDate's inherited Next lint plugins still exclude ESLint 10, so its peer gate remains explicit while a supported composition is investigated.

Authenticated inspection on October 10 confirms the Studio account uses Workers Free. The current documented bundle limit is 64 MiB uncompressed for both plans, with no compressed-size limit. Startup time, the Free plan's 10 ms CPU limit, actual artifact uploads and critical journeys remain provider acceptance gates. The Docket compatibility trial's approximately 34.8 MiB uncompressed bundle fits the documented size allowance; this does not establish deployability or production acceptance. See [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

| Task                         | Source checkpoint                                                                                                                                                                                                                                                                                                                                                                                            | Remaining acceptance and release work                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inventory                 | Studio account authentication, existing host identities, supporting Workers, D1 metadata, and Mintlify differences captured.                                                                                                                                                                                                                                                                                 | Complete route/domain recovery identities, provider error/latency and monthly usage baselines, canonical-origin reconciliation, and authenticated behavior baselines.                                                                                                                                                                                                            |
| 2. Release tooling           | v0.1.8 published after reviewed workflow fixes; isolated Astro and Next preview/promotion/failure/retry/recovery exercises passed. Scoped roots, Images and retained native R2 cache are available.                                                                                                                                                                                                          | Update consumers to the actual published runtime. Prove complete live route/domain restoration and real product provider operations.                                                                                                                                                                                                                                             |
| 3. Shared foundations        | Four packages published at the user-selected initial version 0.0.1. Exact candidate `38116243716-1` approved and promoted without rebuilding in `38116605945`; PR/main checks passed 28 native and 81 browser cases. Fresh read-only registry consumers passed in `38116980056`, including frozen installs, peers and both framework builds; all four registry integrity values match the reviewed tarballs. | Verify consumer-repository package access, regenerate actual product registry locks, and pass fresh product CI. Registry verifier trusted-auth repair PR #5 passed hosted checks and was rebase-merged; product/provider acceptance remains separate.                                                                                                                            |
| 4. Studio                    | `d90e2c8` and `660edea`: lifecycle, independent supporting components, migration guards, Workers artifacts and docs. Local 146 unit, nine supporting Worker and ten artifact-browser checks passed.                                                                                                                                                                                                          | Real registry lock and hosted CI; isolated supporting resources and sandbox Micropub repository/token; provider critical journeys and recovery; reviewed apex cutover.                                                                                                                                                                                                           |
| 5. Curfew                    | `ef19d1d` and `378ecf1`: Astro marketing, retained appearance, shared Mintlify setup/config/docs, and published lifecycle pin.                                                                                                                                                                                                                                                                               | Real registry lock and hosted CI; connect validated source to the existing Mintlify project and verify deployment/search/assets; isolated Workers acceptance; coordinate the current Pages Git publisher before merging or switching hosting. Keep the existing public HTML guide until Mintlify acceptance passes.                                                              |
| 6. Docket docs               | `641a197`: standardized configuration/setup/docs with existing MDX, branding, navigation, asset semantics and API-owned reference preserved.                                                                                                                                                                                                                                                                 | Real registry lock and hosted CI; reconcile canonical origin, record Mintlify deployment for reviewed source, and verify authenticated search/assets and delegated docs delivery.                                                                                                                                                                                                |
| 7. Applications              | LogDate native builds and 140 retained-artifact Workers scenarios passed; cache bytes retained and actual WillieCubed repository/develop identity corrected in `8f9f7ce`. Docket source checkpoint `25fd23d`; unchanged pair rejects Node middleware, while the isolated Next 16.3.8/OpenNext 1.20.10 trial builds with experimental Node proxy support.                                                     | Complete Docket's retained-artifact runtime checks and review the experimental Node middleware risk. For both apps, verify real isolated backends, Images/cache, sign-in/session/logout/passkeys, private-cache boundaries, delivery/revalidation, streaming and native associations as applicable; then perform reviewed promotions and canonical-origin authentication checks. |
| 8. Production and retirement | No company frontend has switched production hosting. Mintlify is retained.                                                                                                                                                                                                                                                                                                                                   | Cut over Studio, Curfew, LogDate, then Docket; observe each for 24 hours before the next cutover. Verify release identity and critical journeys, disable competing old-host publication, retain each prior host/recovery configuration for 14 days, then retire unused hosting/secrets/integrations and finalize operational docs.                                               |

Shared package publication, product source integration, provider acceptance, production cutover, and old-host retirement are separate milestones. A source checkpoint or passing local suite does not complete its whole task.

## Documentation references

- [Existing Studio release lifecycle](https://github.com/TheHypertextStudio/release-engineering)
- [Astro on Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Astro view transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Cloudflare OpenNext adapter](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Cloudflare Next.js and vinext guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Workers versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
- [Next.js intercepting routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes)
- [Mintlify documentation](https://www.mintlify.com/docs/index)
- [Mintlify subpath hosting](https://www.mintlify.com/docs/deploy/docs-subpath)
- [Mintlify preview deployments](https://www.mintlify.com/docs/deploy/preview-deployments)
