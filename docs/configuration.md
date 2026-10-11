# Configuration

`studio.yaml` is the product lifecycle declaration. `studio.lock.json` pins the shared lifecycle runner to release-engineering `v0.1.6` and its SHA-256. Keep that pin exact; update it only with a reviewed lifecycle change.

The declared toolchain is Python 3.11+, Node 24.20.0, and pnpm 11.9.0. `.nvmrc` pins the Node patch. The runner and `pnpm-lock.yaml` are the setup/build owners; do not add global package managers or unpinned setup scripts.

The shared frontend configuration package is pinned to `@thehypertextstudio/web-config` `0.1.0` in `package.json` and `pnpm-lock.yaml`. That immutable GitHub Packages release is not published yet, so a clean install and CI build remain gated on its publication and read-only registry access. Do not substitute a local tarball or a floating package range in a committed build.

For local installs, configure pnpm's user-level GitHub Packages credential using a read-only token with access to `TheHypertextStudio/web-platform`. CI supplies its scoped read token to the install step. Keep the credential outside repository files and build artifacts.

## Website Worker

`studio.yaml` declares the Astro candidate as a `static-site` deployed to Workers. `wrangler.site.json` declares the account, asset binding, Worker names, environments, and release metadata route. Candidate assembly injects `STUDIO_SOURCE_SHA`, `STUDIO_ARTIFACT_SHA256`, and `STUDIO_CANDIDATE_ID` after hashing. Those values are runtime configuration and must not be written into the asset archive.

The staging host is `staging.hypertext.studio`; the production host is `hypertext.studio`. Provider-side route creation and validation are separate operations. The route for `/__studio/release` runs through the Worker before static asset lookup.

## Supporting Workers

Each service owns `workers/<service>/wrangler.toml`. The only named environments are `staging` and `production`; service names are component configuration, not Wrangler environment names.

| Service      | Configuration                      | Production data or secret                         |
| ------------ | ---------------------------------- | ------------------------------------------------- |
| `www`        | `workers/www/wrangler.toml`        | None                                              |
| `poem`       | `workers/poem/wrangler.toml`       | None                                              |
| `webmention` | `workers/webmention/wrangler.toml` | Existing `hypertext-studio` D1 only               |
| `micropub`   | `workers/micropub/wrangler.toml`   | `GITHUB_TOKEN` secret only on the Micropub Worker |
| `oembed`     | `workers/oembed/wrangler.toml`     | None                                              |

The staging Webmention binding uses a distinct placeholder identity for local/staging configuration. Never replace the production database ID or point preview workloads at the production database. Do not put Micropub's token in `.env`, site configuration, workflow artifacts, or local candidate files. Local Micropub development may use the ignored `.dev.vars.micropub` file.

## Optional public identity

- `BLUESKY_HANDLE` enables Bluesky profile and syndication links.
- `BLUESKY_DID` generates `/.well-known/atproto-did`.

Blank values publish nothing. Set public build variables in the candidate workflow so their values are included in the reviewed artifact identity.
