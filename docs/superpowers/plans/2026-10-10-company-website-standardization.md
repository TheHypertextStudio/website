# Hypertext Studio Website Standardization Implementation Plan

**Updated 2026-10-11:** The user requested removal of all ad hoc or unconventional migration workflows and scripts. This revision replaces the earlier custom lifecycle, candidate manifest, repackaging and recovery design. Historical acceptance notes describe earlier work; they are not current operating instructions.

## Goal and scope

Standardize configuration, setup and documentation across the company websites. Move Studio, Curfew, LogDate and Docket frontends to Cloudflare Workers. Keep Mintlify for Curfew and Docket documentation. Preserve each product's content, appearance, URLs, accessibility, auth and application behavior.

Native applications, backend APIs, databases, licensing, webhooks and existing native distribution remain on their current systems. Reasonable Tech, Lovelace and LVBT are outside this migration.

## Standard toolchain

| Surface      | Build                                                                      | Local Workers preview        | Deployment              |
| ------------ | -------------------------------------------------------------------------- | ---------------------------- | ----------------------- |
| Studio       | Astro -> `dist/`                                                           | Wrangler dev                 | Wrangler deploy         |
| Curfew       | Astro -> `dist/`                                                           | Wrangler dev with docs proxy | Wrangler deploy         |
| LogDate      | Official OpenNext Cloudflare build                                         | OpenNext preview             | OpenNext deploy/upload  |
| Docket       | Official OpenNext Cloudflare build plus existing monorepo/SW prerequisites | OpenNext preview             | OpenNext deploy/upload  |
| Product docs | Shared configuration + pinned Mintlify CLI                                 | Mintlify dev                 | Mintlify Git publishing |

- Node 24 and pnpm 11, pinned to compatible patches in each repository. Dependencies stay in ordinary pnpm locks.
- Shared private GitHub Packages: `web-config`, `web-tokens`, `web-ui`, `web-docs`, starting at the approved `0.0.1` release.
- Existing `./bootstrap worktree prepare` remains the worktree setup owner. Development, checks, build and preview use package scripts invoking the actual tools.
- One source Wrangler configuration per frontend, with `staging` and `production` environments. Official OpenNext owns its generated output and cache population.
- GitHub Actions provides ordinary frozen-install CI. Use conventional protected deployment environments when automating deployment. Pull requests receive no production deployment credentials.
- Native Worker version and deployment IDs provide release history; native Wrangler rollback restores a previous Worker version. DNS/routes and external services require their own explicit reversal when changed.
- No downloaded website lifecycle runner, custom candidate/evidence JSON, second archive format, release identity endpoint, recovery journal, cache seed adapter, temporary activation flags or one-off credential/lock investigation jobs.

## Shared configuration and documentation

Retain the four versioned frontend packages. Product themes retain their approved fonts, colors and artwork; Curfew docs use the approved accessible orange `#b25e30`.

Mintlify remains the rendering/search/publishing owner. `web-docs` provides shared defaults and config generation; products own MDX, navigation, URLs and branding. Commit the native `docs.json` generated from the shared base and product `docs.site.json`. CI checks that generated config is current. Use pinned Mintlify tools for authoring and validation.

Each repository documents setup, configuration and environment names, local development, checks, deployment, rollback and troubleshooting. Common instructions live in `web-platform`; product docs record only their differences and link to the common guidance.

Private package CI authentication uses repository access grants and short-lived `GITHUB_TOKEN` with `packages: read`. Prefer workload identity federation where supported. No classic PAT workaround. Cloudflare authentication must follow supported provider tooling with separately scoped staging/production access.

## Phase 1: Remove custom migration machinery

- [x] Studio: remove candidate/promote/staging-recovery workflows and helpers, one-off CI modes, website lifecycle runner/config, custom identity Worker and assembly scripts. Build directly into `dist/`; retain redirects, headers and existing browser/artifact checks.
- [x] Curfew: remove parity snapshot gate, public asset copier, candidate assembler, lifecycle runner/config and temporary lock CI. Put static assets in Astro `public/`; preserve native appcast publication through a normal build output.
- [x] LogDate: remove lifecycle/candidate/promote/assembly/identity layers. Use official OpenNext commands and one Wrangler config. Preserve isolated waitlist, auth and backend selection.
- [x] Docket: remove equivalent lifecycle/repackaging layers, duplicate prebuilt config, one-off CI modes and temporary migration holds. Preserve application compatibility code and existing backend release checks.
- [x] Shared tooling: remove website-specific adapter/recovery/cache extensions after all website callers are gone. Preserve existing unrelated package/native release tooling and published tags.
- [x] Update current documentation and existing checks that reference removed tooling. Preserve historical evidence with an explicit superseded notice.

- [x] Web platform: remove lifecycle/candidate/promotion and one-off registry consumer tooling; use ordinary package scripts, a native Astro preview and a manual GitHub Packages workflow. Update shared repository documentation templates.

No deployment, provider configuration change or production publication is part of this cleanup phase. Existing source branches remain reviewable before integration.

## Phase 2: Integrate and accept ordinary builds

- [x] Review cleanup diffs for each repository, preserving unrelated work and accepted dependency locks.
- [ ] Require existing hosted CI and mandatory checks on reviewed source; do not introduce migration-only probe suites.
- [ ] Integrate each repository using the established linear Git workflow. Keep Docket integration pending its production backend baseline and publication decision.
- [ ] Confirm Curfew Mintlify Git publishing uses `curfew/main/web/docs`, including the `/docs/mcp` guide alias, navigation and accessible theme.
- [ ] Reconcile Docket's Mintlify custom domain through the pending provider confirmation.

Studio cleanup is integrated at `831d36d`, LogDate at `7cf747e`, web-platform at `e2dea20` and release-engineering at `37fe36f`. Their ordinary default-branch CI passed. Curfew's website/docs CI passed; native capture CI and integration remain pending. Docket cleanup is reviewed and committed at `397e6284`, with integration still held for the backend baseline.

## Phase 3: Complete isolated staging

- [ ] Finish supported Cloudflare credential setup in Chrome's Hypertext Studio profile when the user is available.
- [ ] Confirm isolated staging Worker names, hostnames, Access policies and separate bindings. Docket/LogDate staging R2 buckets already exist; their app deployments and scoped credentials remain pending.
- [ ] Deploy through native Wrangler/OpenNext commands and record native version/deployment IDs.
- [ ] Review real Studio/Curfew pages, redirects, metadata, assets, docs and supported publishing endpoints.
- [ ] Review real LogDate/Docket runtime, auth/cookies, API destinations, caching/revalidation, docs, forms and application journeys. Use isolated staging forms and backends.
- [ ] Reauthenticate Google when the user returns, then read Docket's existing backend deployment baseline before integration. Do not deploy a backend as part of this frontend migration.
- [ ] Check native rollback on staging; retain prior version IDs and independent route/DNS baselines.

Studio already has its single-Worker staging token in the main-only GitHub `staging` environment. Its existing staging custom domain is now protected by Access application `79db268c-2596-45e7-a69f-8c8a445d799c`, using the existing Studio Google Workspace provider and reusable staff preview policy `2fddfb97-c128-4226-b4e6-8e7e97a0d07e`. Anonymous requests redirect to Access; authenticated website acceptance remains open. A conventional staging deployment workflow is prepared to consume successful main CI output and invoke native Wrangler. Its actual hosted provider use remains pending.

## Phase 4: Approved production cutovers

For each site independently:

- [ ] Resolve DNS ownership, current deployment, route/TLS state and provider access. LogDate registrar/DNS access is still pending.
- [ ] Review the accepted staging source, native build/deployment output, production bindings and exact cutover/rollback steps.
- [ ] Obtain production cutover approval and execute the native provider operation.
- [ ] Confirm actual canonical domain, TLS, redirects, assets, metadata and application behavior.
- [ ] Observe production, then retire old Pages/Vercel hosting only after the agreed rollback window. Never delete current hosting as a prerequisite for preview acceptance.

## Completion criteria

All four company frontends run on Workers; Curfew/Docket docs remain on Mintlify; shared packages/config/setup/docs are adopted; ordinary CI passes; real provider and application acceptance is complete; native rollback and route reversal are documented; superseded hosting is retired after the observation window. Source implementation or a successful build alone does not complete the migration.
