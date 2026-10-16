# Configuration

Use `.nvmrc` for Node 24.20.0, `package.json` for pnpm 11.9.0 and Wrangler 4.127.1, and `pnpm-lock.yaml` for dependencies. The existing shared worktree bootstrap prepares local dependencies; package scripts invoke the actual framework and provider tools.

The shared frontend configuration package is the private GitHub Package `@thehypertextstudio/web-config`, pinned to `0.0.1` in `package.json` and resolved through `pnpm-lock.yaml`. Refresh it through the ordinary package workflow with approved registry access. Keep registry dependencies reproducible across local setup and CI; do not commit local package overrides or use a local tarball checksum as registry integrity.

`pnpm-workspace.yaml` explicitly permits install scripts only for `esbuild`, `sharp`, and `workerd`, the same native dependencies already rebuilt by `scripts/bootstrap-worktree`. This checked-in policy lets fresh pnpm 11 installs prepare those tools without relying on machine-local build approvals. Dependency scripts outside this allowlist remain blocked.

pnpm 11's default 24-hour release-age policy remains active. The only immediate-install exception is the exact reviewed internal version `@thehypertextstudio/web-config@0.0.1`. New package versions require their own review; no organization-wide age exception is configured.

CI uses each repository's short-lived `GITHUB_TOKEN` with `packages: read` and explicit package read grants. Install authentication uses a temporary trusted pnpm user configuration containing only an environment placeholder; the install step removes it on exit. Keep credentials outside repository files and build artifacts.

Use workload identity federation wherever the provider supports it. Do not create classic personal access tokens as a package-access workaround. A repository that cannot receive a native package grant needs a reviewed secret-free access design before its authenticated setup can be accepted. Local setup likewise needs an approved authentication method; hosted token access does not establish local registry access.

Cloudflare's current [GitHub Actions deployment guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) documents API-token authentication. No supported native GitHub OIDC exchange was established. Google WIF can authenticate supported Google services; it does not authenticate Cloudflare. An `id-token: write` permission alone does not authenticate deployment. Review existing credential scope before activating provider callers; no new credential is authorized by this setup reference.

## Website hosting

`wrangler.jsonc` points Workers Static Assets at Astro's `dist/` directory. It declares the Studio account and distinct `staging` and `production` Worker names. No custom release metadata endpoint or deployment runner is required.

The staging host is `staging.hypertext.studio`; the production host is `hypertext.studio`. Staging routes are managed separately from code uploads and omitted from the config. `workers_dev` and `preview_urls` are disabled. Production's explicit apex route is applied only during the approved cutover.

Use separately scoped deployment credentials for staging and production. Site runtime has no secrets or database bindings. Package installation uses the repository's short-lived GitHub token; Cloudflare deployment authentication remains separate.

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

Blank values publish nothing. Set public build variables in the build workflow so their values are included in the built output.
