# Deployment and recovery

## Candidate lifecycle

GitHub Actions remains the intended release owner. The product declaration packages the Astro output and a small Worker module into a `static-site` candidate. The Worker serves `assets/` and answers `GET /__studio/release` with the source SHA, artifact SHA-256, and candidate ID using `Cache-Control: no-store`.

The deployment adapter must deploy the built candidate without rebuilding. The staging and production overlays select separate Worker names. Staging preserves its separately provisioned route; production declares `hypertext.studio/*`, while the existing more-specific protocol routes continue to point at their independent Workers. A candidate must pass its identity probes before it can be considered for promotion.

The candidate and promotion callers pin published release-engineering v0.1.8 at `878260def7229cd3df7f752b32e5581230c5db2d`, matching `studio.lock.json`. Both are inactive by default. No activation variables, credentials, environment protections or provider resources are created by this source change. Ordinary CI's production job remains disabled.

## Activation prerequisites

`candidate.yml` accepts only pushes to `main` in `TheHypertextStudio/website` and requires repository variable `STUDIO_WORKERS_CANDIDATES_ENABLED` to equal `true`. The shared workflow checks and builds once, stages the retained archive, probes its identity, and saves `candidate-<run-id>-<attempt>` for review. The shared job declares the GitHub `staging` environment. Staging deployment is an intended provider write after activation; this is not a build-only workflow. Pull requests cannot invoke this caller or receive its provider secrets.

The declared candidate contains only the frontend assets Worker. Its staging upload does not deploy the five supporting Workers and does not need sandbox Micropub write credentials or a staging Webmention database. Successful supporting-service sandbox journeys remain separate acceptance work. On October 11 the missing `staging` environment was created with a deployment policy allowing only the `main` branch. The existing `preview` environment is retained. Environment credentials, provider scopes and frontend resources still require verification before activation. The environment configuration alone does not establish provider readiness.

`promote.yml` accepts only explicit manual dispatches on `main` in the owner repository and requires `STUDIO_WORKERS_PROMOTION_ENABLED` to equal `true`. The shared job declares the GitHub `production` environment. On October 11 its verified configuration was updated to require reviewer `WillieCubed` and allow only the `main` branch. Self-review is permitted for the existing single-operator release contract; this does not claim independent two-person approval or disabled administrator bypass. The existing main-branch ruleset requires the quality, test, browser, build, artifact and CodeQL checks. Provider scopes and recovery acceptance remain required before activation.

Both callers use the published workflow's supported `secrets: inherit` contract. The shared credential preparer exports the existing `CLOUDFLARE_API_TOKEN` repository fallback when no managed binding is declared. A repository token may reach both environments and may have broader production authority than a staging job should receive. Before enabling either caller, verify environment-scoped credential selection, staging and production provider scopes, explicit Studio account identity, separate Worker resources, preview hostname ownership, health probes and the complete prior release/routing baseline. Do not create or broaden credentials to make a failed gate pass. Environment protections must stop unreviewed production operations.

The callers grant the fixed GitHub permissions required by v0.1.8: candidate contents write/actions read/packages read/ID token write, and promotion contents write/actions read/packages write/ID token write. These support the native candidate/readiness and promotion journals; they do not authorize automatic production promotion. No product deployment or provisioning shell command is added.

The shared frontend configuration package `@thehypertextstudio/web-config@0.0.1` is published and pinned in the canonical registry lock. [Hosted CI38120706952](https://github.com/TheHypertextStudio/website/actions/runs/38120706952) passed all six ordinary jobs at source `01d6cf43eea53ba6b4eebf16f759007d8045fe6a`, including frozen installation, source checks, build, browser checks and retained-artifact validation. Provider inventory, lock refresh and production jobs were skipped; this result does not establish provider readiness. The current Bluesky variables are unset, so the supported blank public identity is preserved. v0.1.8 does not export the ordinary CI build's `BLUESKY_HANDLE`/`BLUESKY_DID` variables into candidate builds. If either identity variable is configured later, pause candidate activation until the shared build-variable contract preserves it; do not promote a candidate that silently drops configured identity.

## Human review and promotion

Inspect the retained candidate's `candidate.json`, `review.md`, shipping archive and manifest digest. Verify the candidate on its isolated staging host and attach reviewable evidence for all four declared gates:

- `staging-journeys`: critical site journeys, redirects, custom 404, cache/security headers, association files, feeds and sitemaps against these exact bytes.
- `supporting-route-isolation`: the five existing protocol Workers and production D1 remain intact; staging has no production publishing or data authority.
- `production-recovery`: the previous complete site artifact, supporting Worker versions and full route/domain baseline are retained, with reviewed restoration and observation procedures.
- `public-identity`: canonical origins and current optional identity metadata match the intended public site.

Dispatch **Promote reviewed website candidate** with the exact `candidate_id` (`<run-id>-<attempt>`), `manifest_sha256` and review JSON. The JSON has `schema: 1`, the same `manifest_sha256`, `reviewer` equal to the dispatching human's GitHub login, and `checks`, a list of `{name, status: "passed", url}` records for the four gates. Each URL must point to actual reviewable evidence; input shape alone does not establish acceptance. Missing evidence, another owner, changed bytes, revoked or superseded authorization and failed identity probes must block publication.

The native promotion restores the candidate's exact runtime, policy and bindings and deploys its retained bytes without rebuilding or resolving product dependencies. Its Worker upload applies the declared `hypertext.studio/*` production route, so authorizing this dispatch authorizes the reviewed frontend cutover; it is not a staging-only operation. Retry the same candidate/digest/evidence to resume its journal; do not substitute a fresh local build. Do not use the retired Pages deployment commands. Adding these callers does not authorize that production cutover.

## Current provider resources

- Cloudflare zone: `hypertext.studio`
- Existing Webmention D1: `hypertext-studio`
- Existing supporting Workers: `hypertext-studio-www`, `hypertext-studio-poem`, `hypertext-studio-webmention`, `hypertext-studio-micropub`, and `hypertext-studio-oembed`
- Candidate site Workers: `hypertext-studio-site-staging` and `hypertext-studio-site`
- GitHub repository: `TheHypertextStudio/website`

Production upload applies its declared apex Worker route. Staging omits routing declarations and explicitly disables workers.dev and version preview URLs, preserving its separately provisioned connection. [Wrangler documents this routing ownership](https://developers.cloudflare.com/workers/wrangler/deprecations/). This supports a routine deployment credential scoped to Editor on the existing staging Worker, without production zone route-write access. Bootstrap routing and retain its recovery metadata before activation; the exact pinned upload still needs provider acceptance with that credential.

Provisioning, unrelated route changes, secret writes, and D1 migration remain separate provider operations outside these callers. The October 11 preflight found no frontend site Worker or staging DNS record. Subsequent interactive bootstrap created `hypertext-studio-site-staging` (`543af5e594a0411997f74becebfd4b0a`) and its isolated custom domain `staging.hypertext.studio`, with workers.dev and version previews disabled. The bootstrap serves Cloudflare's Hello World template and has no data bindings; it is not the website candidate. Provider metadata and the prior absent state are retained in the acceptance receipts. No production connection changed.

The custom-domain ID is `47787bd1e9680f991717e8662453dd4d82c16ba2`; Cloudflare owns its generated DNS record. Preserve this connection during routine upload. Recovery before candidate activation restores the recorded bootstrap version and URL settings; removing the custom domain and staging Worker returns to the recorded absent state, as a separate reviewed provider operation. Credentials, actual candidate identity, scoped upload and restoration acceptance remain open.

## Recovery

Before cutover, record the previous complete site release, the versions of all five supporting Workers, and every route/domain binding. Recovery must restore the prior site artifact and its route state together; do not rebuild a previous source revision and assume it is byte-identical. D1 migrations remain forward-only and are not rolled back as part of a frontend restore.

Production cutover and recovery have not been exercised for the real Hypertext Studio site. The Task 2 test-resource recovery fixtures are isolated acceptance resources and do not establish production recovery. Do not move the apex route until the candidate has provider acceptance and the release record identifies the prior deployment and route state.

## Required candidate acceptance

Before promotion, verify the exact candidate on its isolated staging host:

- `www` redirects preserve the full path and query string.
- `/api/poem`, `/webmention`, `/webmentions`, `/micropub`, and `/oembed` remain served by their existing independent Workers.
- Micropub's write token is present only on the production Micropub Worker and is not available to site builds or previews.
- The existing Webmention D1 database and stored records are retained; staging uses separate data.
- Draft studies remain unpublished, and feeds, sitemaps, canonicals, and association files match current public behavior.
- Unknown routes return the custom 404 without a general SPA fallback; static cache headers are appropriate.
- The release probe reports the approved source, archive digest, and candidate ID, with `Cache-Control: no-store`.

These checks and provider promotion are pending. A local build, test fixture, or successful HTTP response alone is not production acceptance.

## Existing credential inspection

The manual CI inventory accepts `cloudflare_credential_kind` as `none` (default), `user` or `account` alongside `cloudflare_recovery_inventory=true`. An explicit kind adds at most two read-only requests: verify the existing hosted token, then inspect that verified token's own policies. The retained artifact allowlists token ID/status/validity and permission groups/resources; it excludes token values, arbitrary provider fields and raw errors. It creates no credentials or grants and does not change authentication. A denied or unsupported metadata response records `scope_status: unresolved`; it cannot authorize staging or production. Successful inspection still needs review against the intended environment resources and permissions.

Account verification in [run38124766256](https://github.com/TheHypertextStudio/website/actions/runs/38124766256) identified the existing active token as `ea9099ed066a9871768238f08b284156`; its details API returned 403. Read-only inspection in Chrome's Hypertext Studio dashboard matched that ID to the existing Studio Actions token and showed account-wide settings, D1 and platform grants plus route-write access over all Studio zones. The hosted receipt correctly retains unresolved API scope inspection; separate dashboard evidence establishes that this token is broader than staging requires. Expiry remains unverified. No token values were read, credentials created or permissions changed. This run also passed all six validation jobs at `1a1816eb`, before the subsequent staging configuration change.
