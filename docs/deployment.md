# Deployment

## Canonical path

GitHub Actions is the only automated production deployment owner. Do not connect the Cloudflare Pages project to Cloudflare's Git build integration; a second build owner creates duplicate releases and can publish a commit that did not pass the repository's complete checks.

Run the turnkey setup from an authenticated workstation:

```sh
make bootstrap
```

Bootstrap discovers safe values, creates missing Pages and D1 resources, applies migrations, configures domains and GitHub Actions, and prompts only for credentials it cannot derive. Before each prompt it prints the provider URL, resource owner, repository or account scope, required permissions, and storage destination.

## Required provider state

- Cloudflare zone: `hypertext.studio`
- Pages project: `hypertext-studio`, production branch `main`
- D1 database: `hypertext-studio`
- GitHub repository: `TheHypertextStudio/website`
- GitHub environment: `production`

Cloudflare custom-domain setup owns the apex DNS records. Do not create placeholder A or AAAA records. Keep `www.hypertext.studio` proxied so the `www` Worker route can issue the canonical redirect.

## GitHub Actions credentials

Repository Actions secrets:

| Name                    | Purpose                               |
| ----------------------- | ------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Select the Hypertext Studio account   |
| `CLOUDFLARE_API_TOKEN`  | Pages, Workers, routes, and D1 deploy |

The Cloudflare token should be restricted to the Hypertext Studio account and `hypertext.studio` zone. Bootstrap prints the exact current permission checklist.

Optional repository Actions variables:

| Name             | Effect when non-empty                        |
| ---------------- | -------------------------------------------- |
| `BLUESKY_HANDLE` | Public Bluesky profile and syndication links |
| `BLUESKY_DID`    | `/.well-known/atproto-did`                   |

## Worker secret

Micropub requires one fine-grained GitHub token:

```sh
pnpm exec wrangler secret put GITHUB_TOKEN --env micropub
```

Use repository access for `TheHypertextStudio/website` only, with Contents set to Read and write. Bootstrap walks through token creation and stores the value directly in Cloudflare.

## Database

Local migrations:

```sh
bash scripts/migrate-d1.sh local hypertext-studio
```

Remote migrations:

```sh
bash scripts/migrate-d1.sh remote hypertext-studio
```

Production CI applies remote migrations before deploying Workers.

## Normal release

Merge an approved change to `main` and follow the `CI` workflow. The workflow validates the repository, deploys one verified artifact, and runs `scripts/smoke.sh`. A green local build is not production evidence; the production workflow and live smoke job are the release record.

## Manual recovery

Use only when GitHub Actions is unavailable and an operator has selected the exact commit to restore:

```sh
git switch --detach <verified-commit>
make deploy-break-glass
```

The command warns before building, applies migrations, deploys all Workers and Pages, and smoke-tests production. Database rollback is intentionally manual because migrations are forward-only.
