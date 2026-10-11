# Deployment and recovery

## Candidate lifecycle

GitHub Actions remains the intended release owner. The product declaration packages the Astro output and a small Worker module into a `static-site` candidate. The Worker serves `assets/` and answers `GET /__studio/release` with the source SHA, artifact SHA-256, and candidate ID using `Cache-Control: no-store`.

The deployment adapter must deploy the built candidate without rebuilding. The staging and production overlays select separate Worker names and routes; production uses `hypertext.studio/*`, while the existing more-specific protocol routes continue to point at their independent Workers. A candidate must pass its identity probes before it can be considered for promotion.

The candidate workflow and its exact CI dispatch are not connected in this source change. Use the shared release-engineering workflow when that integration is available. Do not use the retired Pages deployment commands or deploy a local build as a substitute for an approved candidate.

## Current provider resources

- Cloudflare zone: `hypertext.studio`
- Existing Webmention D1: `hypertext-studio`
- Existing supporting Workers: `hypertext-studio-www`, `hypertext-studio-poem`, `hypertext-studio-webmention`, `hypertext-studio-micropub`, and `hypertext-studio-oembed`
- Candidate site Workers: `hypertext-studio-site-staging` and `hypertext-studio-site`
- GitHub repository: `TheHypertextStudio/website`

Provisioning, route changes, secret writes, and D1 migration are separate provider operations. The source configuration does not prove that the staging hostname, production route, credentials, bindings, or prior versions are provisioned correctly.

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
