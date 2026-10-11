# Deployment and recovery

## Candidate lifecycle

GitHub Actions remains the intended release owner. The product declaration packages the Astro output and a small Worker module into a `static-site` candidate. The Worker serves `assets/` and answers `GET /__studio/release` with the source SHA, artifact SHA-256, and candidate ID using `Cache-Control: no-store`.

The deployment adapter must deploy the built candidate without rebuilding. The staging and production overlays select separate Worker names and routes; production uses `hypertext.studio/*`, while the existing more-specific protocol routes continue to point at their independent Workers. A candidate must pass its identity probes before it can be considered for promotion.

The candidate and promotion callers pin published release-engineering v0.1.8 at `878260def7229cd3df7f752b32e5581230c5db2d`, matching `studio.lock.json`. Both are inactive by default. No activation variables, credentials, environment protections or provider resources are created by this source change. Ordinary CI's production job remains disabled.

## Activation prerequisites

`candidate.yml` accepts only pushes to `main` in `TheHypertextStudio/website` and requires repository variable `STUDIO_WORKERS_CANDIDATES_ENABLED` to equal `true`. The shared workflow checks and builds once, stages the retained archive, probes its identity, and saves `candidate-<run-id>-<attempt>` for review. The shared job declares the GitHub `staging` environment. Staging deployment is an intended provider write after activation; this is not a build-only workflow. Pull requests cannot invoke this caller or receive its provider secrets.

The declared candidate contains only the frontend assets Worker. Its staging upload does not deploy the five supporting Workers and does not need sandbox Micropub write credentials or a staging Webmention database. Successful supporting-service sandbox journeys remain separate acceptance work. Read-only GitHub inspection on October 11 confirmed only `preview` and `production` environments, while the pinned candidate job uses `staging`; resolve that exact environment mismatch and verify credential selection and protections before activation. Existing environment names alone do not establish readiness.

`promote.yml` accepts only explicit manual dispatches on `main` in the owner repository and requires `STUDIO_WORKERS_PROMOTION_ENABLED` to equal `true`. The shared job declares the GitHub `production` environment. Read-only inspection on October 11 confirmed that environment had **no protection rules or deployment branch policy**. Required reviewer and branch protections must be configured and verified separately before activation; their names in YAML do not establish protection.

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

The shared deployment applies the site's declared Worker route during upload. Provisioning, unrelated route changes, secret writes, and D1 migration remain separate provider operations outside these callers. The source configuration does not prove that the staging hostname, production route, credentials, bindings, or prior versions are provisioned correctly.

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
