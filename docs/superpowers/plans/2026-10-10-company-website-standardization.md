# Hypertext Studio Website Standardization Implementation Plan

## Goal and scope

Standardize configuration, setup and documentation across the company websites. Move Studio, Curfew, LogDate and Docket frontends to Cloudflare Workers. Keep Mintlify for Curfew and Docket documentation. Preserve each product's content, appearance, URLs, accessibility, auth and application behavior.

Native applications, backend APIs, databases, licensing, webhooks and native distribution retain their existing systems. Reasonable Tech, Lovelace and LVBT are outside this migration.

Assume existing authentication works wherever this migration leaves it unchanged. Verification covers the routing, forwarding, cookie scope, RP/origin configuration and OAuth client settings this migration changes. Use existing checks and native configuration/runtime observations; do not require the owner to create a personal staging account or sign in as a prerequisite for hosting migration. Authentication defects introduced by the migration still require correction.

The approved cleanup integration includes Docket's existing automatic production API/admin rollout and database migrations. Preserve its ordinary CI and release gates. LogDate’s production migration, including DNS and Workers hosting, is authorized. Studio, Curfew and Docket frontend production cutovers require separate approval.

## Standard toolchain

| Surface      | Build                                                                      | Local Workers preview                          | Deployment                                             |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Studio       | Astro → `dist/`                                                            | Existing Worker preview script                 | Existing staging workflow and native deployment script |
| Curfew       | Astro → `dist/`                                                            | Existing Worker preview script with docs proxy | Existing staging workflow and native deployment script |
| LogDate      | Official OpenNext Cloudflare build                                         | OpenNext preview                               | OpenNext deploy/upload                                 |
| Docket       | Official OpenNext Cloudflare build plus existing monorepo/SW prerequisites | OpenNext preview                               | OpenNext deploy/upload                                 |
| Product docs | Shared configuration and pinned Mintlify CLI                               | Mintlify dev                                   | Mintlify Git publishing                                |

- Use `cf` for authenticated Cloudflare account and resource administration. Project builds and deployment workflows retain their pinned native tools and adapters.
- Pin Node 24 and pnpm 11 to compatible patches in each repository. Dependencies stay in ordinary pnpm locks.
- Use the shared private GitHub Packages `web-config`, `web-tokens`, `web-ui` and `web-docs`, starting at the approved `0.0.1` release.
- Keep `./bootstrap worktree prepare` as the worktree setup owner. Package scripts invoke the actual development, check, build and preview tools.
- Maintain one source Worker configuration per frontend, with separate staging and production environments. Official OpenNext owns its generated output and cache population.
- Use ordinary frozen-install GitHub Actions CI and protected deployment environments. Pull requests receive no production deployment credentials.
- Use native Worker version and deployment history for rollback. DNS/routes and external services need their own recorded reversal steps.
- After deployment or rollback, correlate requests to executing Workers with native runtime `scriptVersion.id` and the reviewed build output. For assets-only Workers, verify the native domain association, selected deployment/version, exact delivered bytes, TLS, headers and redirects; there is no executing script to tail. Inspect the selected version's bindings; generic script settings may describe a newer uploaded version that is not serving traffic.
- Administer managed Custom Domains and routing independently of restricted Worker deployment credentials. Keep more-specific backend and service routes intact. Frontend hosting must not depend on a Pages or Vercel origin.
- Exclude downloaded website lifecycle runners, custom candidate/evidence JSON, second archive formats, release identity endpoints, recovery journals, cache seed adapters, temporary activation flags and one-off credential/lock investigation jobs.

## Shared configuration and documentation

Retain the four versioned frontend packages. Product themes retain their approved fonts, colors and artwork; Curfew docs use the approved accessible orange `#b25e30`.

Mintlify owns documentation rendering, search and publishing. `web-docs` supplies shared defaults and configuration generation; products own MDX, navigation, URLs and branding. Commit the native `docs.json` generated from the shared base and product `docs.site.json`. CI checks that generated configuration is current. Use pinned Mintlify tools for authoring and validation.

Each repository documents setup, configuration and environment names, local development, checks, deployment, rollback and troubleshooting. Common instructions live in `web-platform`; product documentation records its differences and links to that guidance.

Application sessions use host-only cookies and separate production/staging credential stores. The original hosting migration kept LogDate staging outside its production parent-cookie domain. The browser-session follow-up retires those legacy cookies and uses `staging.logdate.app`; see [the Studio browser session standard](https://github.com/TheHypertextStudio/product-standards/blob/main/docs/product-standards.md#browser-session-boundaries). A narrower new cookie alone does not erase an old parent-domain cookie. Keep browser origins, backend identity handles and passkey relying-party IDs explicit; coordinate staging RP and allowed-origin changes through ordinary backend configuration.

Private package CI authentication uses repository access grants and short-lived `GITHUB_TOKEN` with `packages: read`. Prefer workload identity federation where supported. No classic PAT workaround. Cloudflare authentication uses supported provider tooling and separately scoped staging/production access.

Docket and LogDate each use a separate R2 incremental cache bucket. Their supported S3 cache upload uses `--rclone --no-x-provision`, a token limited to the site's Worker and object access limited to its cache bucket. Preserve those scopes when choosing an upload method. Store deployment credentials in the corresponding protected GitHub environment, outside build inputs and public variables, and rotate them before expiry. Astro frontends do not need R2 cache credentials.

LogDate's supervised production rollout may use the approved official adapter's interactive Cloudflare sign-in. Pass the selected Studio OAuth session through the supported native token command and process environment so deployment and remote cache population use the same account. Keep its staging S3 workflow and independently scoped credentials. Cache population must succeed before serving a new production build.

References: [OpenNext cache upload](https://opennext.js.org/cloudflare/cli), [R2 permissions](https://developers.cloudflare.com/r2/api/tokens/).

## Phase 1: Remove custom migration machinery

- [x] Studio: remove candidate/promote/staging-recovery workflows and helpers, one-off CI modes, website lifecycle runner/config, custom identity Worker and assembly scripts. Build directly into `dist/`; retain redirects, headers and existing browser/artifact checks.
- [x] Curfew: remove parity snapshot gate, public asset copier, candidate assembler, lifecycle runner/config and temporary lock CI. Put static assets in Astro `public/`; preserve native appcast generation and signing ownership.
- [x] LogDate: remove lifecycle/candidate/promote/assembly/identity layers. Use official OpenNext commands and one Worker configuration. Preserve isolated waitlist, auth and backend selection.
- [x] Docket: remove equivalent lifecycle/repackaging layers, duplicate prebuilt configuration, one-off CI modes and temporary migration holds. Preserve application compatibility code and existing backend release checks.
- [x] Shared tooling: remove website-specific adapter/recovery/cache extensions after all website callers are gone. Preserve unrelated package/native release tooling and published tags.
- [x] Update current documentation and existing checks that reference removed tooling. Preserve historical evidence with an explicit superseded notice.
- [x] Web platform: remove lifecycle/candidate/promotion and one-off registry consumer tooling; use ordinary package scripts, a native Astro preview and a manual GitHub Packages workflow. Update shared repository documentation templates.

Cleanup does not authorize provider changes or production publication. Preserve reviewable source changes until integration gates pass.

## Phase 2: Integrate and accept ordinary builds

- [x] Review cleanup diffs for each repository, preserving unrelated work and accepted dependency locks.
- [x] Validate the current reviewed source with ordinary checks. Preserve existing hosted CI and mandatory checks; use the explicitly approved local-validation/manual-integration exception for capacity-blocked LogDate CI without claiming a hosted pass. Do not introduce migration-only probe suites.
- [x] Align Docket’s existing bootstrap owner with the shared `./bootstrap worktree prepare` setup entrypoint and validate its native local checks.
- [x] Adopt the shared `./bootstrap worktree prepare` setup entrypoint in LogDate while preserving its native pnpm workspace and checks.
- [x] Integrate Docket's setup, MCP documentation and verification tooling follow-ups with linear history.
- [x] Integrate the cleanup in each repository using the established linear Git workflow.
- [x] Confirm Curfew Mintlify Git publishing uses `curfew/main/web/docs` and publishes the reviewed documentation source.
- [x] Accept Curfew’s published `/docs/mcp` guide alias, canonical URL, navigation and accessible theme through the marketing Worker.
- [x] Confirm Docket Mintlify Git publishing uses `athena-web/main/apps/docs` and publishes the reviewed documentation source.
- [x] Reconcile Docket's Mintlify custom domain during its accepted frontend cutover, using `clearthedocket.com/docs`. Publish the provider address change and verify page-specific canonical URLs through the Worker proxy.

## Phase 3: Complete isolated staging

- [x] Configure separately scoped staging deployment credentials for each frontend and each Next site's cache bucket.
- [x] Configure isolated staging Worker names, hostnames and Studio staff Access policies.
- [x] Confirm all four preview hostnames reject anonymous requests with a Cloudflare Access challenge.
- [x] Route LogDate’s auth and tenant hosts under `logdate-preview.hypertext.studio`, outside the production cookie domain. Protect them with the Studio staff policy and accept TLS and sign-in/signup delivery.
- [x] Configure LogDate’s staging WebAuthn RP as `logdate-preview.hypertext.studio` and allow `https://app.logdate-preview.hypertext.studio` through a separately reviewed backend rollout. Preserve backend identity handles, Android origins and disabled migrations; re-register staging passkeys.
- [x] Preserve the independent staging browser RP and frontend origin in the backend’s ordinary deployment contract and configuration.
- [x] Accept the staging RP’s public native association metadata against the staging signer before the backend RP rollout. Preserve native application identifiers and keep application pages behind staff Access.
- [x] Accept passkey registration and sign-in against the staging backend after the coordinated backend and frontend deployments. Retire obsolete LogDate-domain frontend hosts only after replacement auth and tenant acceptance, preserving the backend DNS record.
- [x] Confirm separate staging bindings and successful staff browsing for each frontend.
- [x] Deploy LogDate's explicit staging backend origin and accept page rendering through its existing runtime guard.
- [x] Configure LogDate's separate staging waitlist and accept its browser fallback with a retained provider response.
- [x] Accept LogDate's JavaScript waitlist submission with a retained provider response before signup acceptance.
- [x] Reconcile Docket's existing staging API trusted origins, hosts, passkey RP and cookies with the Workers hostname. Verify configured OAuth callbacks and Lattice URL-client discovery against the same isolated staging backend before application acceptance.
- [x] Match Docket's staging API web origin, trusted origins/hosts and passkey RP to its protected Workers hostname while preserving the existing image, isolated secrets and host-only cookie design.
- [x] Publish and verify Docket's staging Lattice client metadata for provider discovery while protecting the rest of the preview.
- [x] Preserve Docket’s previous Lattice client identity and verify enabled OAuth callback configuration before changing registrations.
- [x] Deploy all four frontends through their native staging workflows after the required checks pass. Retain native version/deployment IDs in operational release records.
- [x] Review real Studio/Curfew pages at desktop and mobile widths, redirects, metadata, assets, docs and sitemap/feed delivery. Preserve Curfew’s absent signed-feed state until a genuine native release exists.
- [x] Review the preserved Studio service endpoints through their existing production routes, including read-only Micropub discovery, oEmbed, Webmentions and Poem delivery.
- [x] Review real LogDate/Docket runtime, auth/cookies, API destinations, caching/revalidation, docs, forms and application journeys. Use isolated staging forms and backends.
- [x] Restore Google access and read Docket's production API/admin revision, image and public configuration baselines before the approved cleanup integration.
- [x] Observe Docket's approved cleanup backend rollout, including migrations, resulting revisions, scheduler reconciliation and actual health.
- [x] Exercise native version rollback and restore the selected version on Studio staging.
- [x] Exercise native version rollback and restore the selected version on Curfew staging.
- [x] Exercise native version rollback and restore the selected version on LogDate staging.
- [x] Exercise native version rollback and restore the selected version on Docket staging.
- [x] Retain native Worker deployment histories and complete DNS exports for all four company zones.
- [x] Retain accepted previous versions and independent route reversal baselines for all four frontends.

Require both anonymous rejection and successful staff access to protected previews. A successful build, deployment job or login redirect alone does not accept the application journeys. Assume unchanged signed-in authentication works; verify behavior changed by the migration, including the isolated staging browser RP, origins and cookies.

## Phase 4: Approved production cutovers

For each site independently:

- [x] Resolve DNS ownership, current deployment, route/TLS state and provider access, including LogDate registrar/DNS ownership.
- [x] Move LogDate's authoritative DNS off Vercel while preserving mail, cloud/cloud-staging backend and api.staging records. Verify registrar authority and retain the complete previous zone for rollback.
- [x] Publish LogDate's approved production Worker with its seeded cache, apex and wildcard routes. Confirm public HTTPS homepage/auth landing rendering, assets, images, native associations and HTTP-to-HTTPS redirects.
- [x] Publish Studio's approved frontend Worker, preserve the existing service routes and apex DNS, and accept public page rendering, feeds, sitemap and www redirects.
- [x] Publish Curfew's approved production Worker and attach its managed frontend domains, preserving more-specific service routes. Verify actual serving-version events for public pages, docs, assets and account handoff while preserving the absent signed-appcast state.
- [x] Accept LogDate's changed Workers streaming/cache behavior, tenant delivery, auth landing redirects and native associations before retiring Vercel. Assume unchanged signed-in/private authentication works; require further checks only where the migration changes that behavior.
- [x] Resolve LogDate's Cache Components cold-cache and repeated tenant-request hangs without dropping its existing PPR, caching or application behavior. Accept the native adapter path against actual Workers requests before treating runtime parity as complete.
- [x] Review accepted staging source, native build/deployment output, production bindings and exact cutover/rollback steps.
- [x] Keep Curfew's native appcast publisher on Workers, preserving generation/signing, release attachments and the public feed URL. Retain the no-public-release state until a real signed native release is available; a future native application release is not a prerequisite for retiring Pages.
- [x] Obtain production cutover approval and execute the native provider operation.
- [x] Confirm the actual canonical domain, TLS, redirects, assets, metadata and application behavior.
- [x] Retire old Pages/Vercel hosting and its DNS and deployment dependencies after each Workers cutover passes the relevant serving and behavior checks. These sites are unlaunched; no fixed observation or recovery window is required. Retain source, build configuration and native Worker version history for recovery.
  - [x] Studio: remove the Pages project and Pages DNS dependency after accepting managed-domain static delivery and preserved service routes.
  - [x] Curfew: remove the Pages project and Pages DNS dependencies after accepting managed-domain delivery and the existing account coordinator handoff.
  - [x] LogDate: remove the Vercel project and exclusive source tooling; use managed apex DNS and a proxied wildcard CNAME with the existing Worker routes.
  - [x] Docket: remove superseded Vercel frontend projects, DNS targets and exclusive source tooling after its approved Workers cutover and ordinary backend release gate.

## Completion criteria

All four company frontends run on Workers; Curfew/Docket docs remain on Mintlify; shared packages/config/setup/docs are adopted; ordinary checks pass through hosted CI or the explicitly approved local/manual integration exception; real provider and application acceptance is complete; recovery uses retained source/build configuration and accepted native Worker versions; superseded hosting and its dependencies are retired after cutover acceptance without a fixed waiting period. Source implementation or a successful build alone does not complete the migration.
