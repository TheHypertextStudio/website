# Configuration

`studio.yaml` is the product lifecycle declaration. `studio.lock.json` pins the shared lifecycle runner to release-engineering `v0.1.8` and its SHA-256. Keep that pin exact; update it only with a reviewed lifecycle change.

The declared toolchain is Python 3.11+, Node 24.20.0, pnpm 11.9.0, and Wrangler 4.127.1. `.nvmrc` pins the Node patch. The runner and `pnpm-lock.yaml` are the setup/build owners; do not add global package managers or unpinned setup scripts.

The shared frontend configuration package is pinned to `@thehypertextstudio/web-config` `0.0.1` in `package.json`. That immutable GitHub Packages release is published; fresh shared registry consumers passed in [run38116980056](https://github.com/TheHypertextStudio/web-platform/actions/runs/38116980056). The product lockfile intentionally has no registry resolution for it: verify this repository's package-read access, regenerate that entry from the real registry, then prove a clean frozen install using read-only access. Setup and CI remain gated until then. Never convert a local tarball checksum into a purported registry resolution or commit a local package override.

`pnpm-workspace.yaml` explicitly permits install scripts only for `esbuild`, `sharp`, and `workerd`, the same native dependencies already rebuilt by `scripts/bootstrap-worktree`. This checked-in policy lets fresh pnpm 11 installs prepare those tools without relying on machine-local build approvals. Dependency scripts outside this allowlist remain blocked.

For local installs, configure pnpm's user-level GitHub Packages credential using a read-only token with access to `TheHypertextStudio/web-platform`. CI supplies its scoped read token to the install step. Keep the credential outside repository files and build artifacts.

The manual **CI** workflow option **Resolve a proposed dependency lock with repository package access** resolves `pnpm-lock.yaml` with the selected branch's declared toolchain and this repository's read-only Actions package access. It uploads only the proposed lockfile for review. Adopt that artifact in source, then require ordinary frozen-install CI before merging. The workflow does not commit its output or deploy a website.

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

The staging Webmention binding uses a distinct placeholder identity for local configuration; remote staging deployment requires an explicitly provisioned database and a reviewed config update. Local migrations select the `DB` binding in the staging configuration. Never replace the production database ID or point preview workloads at the production database. Do not put Micropub's token in `.env`, site configuration, workflow artifacts, or local candidate files. Local Micropub development may use the ignored `.dev.vars.micropub` file. Its staging `GITHUB_REPO` is deliberately unset until an isolated repository and restricted token are provisioned. Production supporting Workers explicitly disable `workers.dev` and preview URLs, matching their existing provider visibility.

## Optional public identity

- `BLUESKY_HANDLE` enables Bluesky profile and syndication links.
- `BLUESKY_DID` generates `/.well-known/atproto-did`.

Blank values publish nothing. Set public build variables in the candidate workflow so their values are included in the reviewed artifact identity.
