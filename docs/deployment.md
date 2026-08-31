# Deployment

End-to-end setup for taking `hypertext.studio` from a fresh GitHub repo to live production. Most of these steps run once; after that, `git push` is the deploy trigger.

## Prerequisites

- A Cloudflare account with `hypertext.studio` added as a zone.
- A GitHub account with permission to create `TheHypertextStudio/website`.
- `wrangler` CLI authenticated (`wrangler login`).
- `gh` CLI authenticated (`gh auth login`).

`make bootstrap` performs the reusable setup and is safe to re-run. It:

- Binds the named `hypertext-studio` Wrangler profile to the checkout.
- Discovers and writes the Cloudflare account ID and D1 UUID.
- Reads the Pages project, D1 database, and site URL from the checked-in project configuration.
- Discovers the GitHub repository from the `origin` remote.
- Creates the configured D1 database and Pages project when absent.
- Applies the idempotent D1 schema.
- Adds the apex and `www` Pages custom domains when absent.
- Defines the dedicated `www` Worker configuration that preserves the path and
  query while redirecting to the canonical apex host; `make deploy-workers`
  performs the actual deployment.
- Refreshes `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions on every run.
- Detects existing provider secrets before prompting.

Only two values cannot be derived safely: a scoped Cloudflare API token for GitHub Actions and a fine-grained GitHub token for Micropub publishing. When either is missing, bootstrap prints the exact dashboard path, resource scope, and permissions before opening the provider CLI's secure prompt. It sends both values directly to their provider; it never writes them to a file or command argument.

For an intentional override, set `GITHUB_REPOSITORY`, `CLOUDFLARE_PAGES_PROJECT`, `CLOUDFLARE_D1_DATABASE`, or `SITE_URL` in the command environment. Otherwise, bootstrap uses the git remote and the existing values in `.env`, `wrangler.toml`, and `package.json`; it does not maintain a second copy inside the script.

## 1. GitHub repo

```sh
gh repo create TheHypertextStudio/website --public --source=. --remote=origin --push
```

Set the SSH remote (the studio prefers SSH over HTTPS):

```sh
git remote set-url origin git@github.com:TheHypertextStudio/website.git
```

## 2. Cloudflare Pages project

```sh
wrangler pages project create hypertext-studio --production-branch=main
```

Then in the Cloudflare dashboard, link the project to GitHub:

- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Root directory:** `/`
- **Environment variables:** copy from `.env.example` (only the `PUBLIC_*` keys)

## 3. Custom domain

In the Pages project settings → Custom domains:

- Add `hypertext.studio` (apex). Cloudflare auto-provisions the TLS certificate.
- Keep `www.hypertext.studio` on Cloudflare DNS. The `www` Worker route handles
  the canonical redirect after `make deploy-workers`.

## 4. D1 database

```sh
wrangler d1 create hypertext-studio
wrangler d1 execute hypertext-studio --remote --file workers/shared/d1-schema.sql
```

Bootstrap discovers the database UUID and writes it into the matching D1 binding in `wrangler.toml`.

## 5. Workers

Each worker has its own environment in `wrangler.toml`. Deploy individually:

```sh
wrangler deploy --env www
wrangler deploy --env poem
wrangler deploy --env webmention
wrangler deploy --env micropub
wrangler deploy --env oembed
```

Or all at once: `make deploy-workers`.

### Worker secrets

Set per-worker via `wrangler secret put <NAME> --env <worker>`:

| Worker     | Secret(s)                                                              |
| ---------- | ---------------------------------------------------------------------- |
| `micropub` | `GITHUB_TOKEN` (fine-grained PAT; repository Contents: Read and write) |
| others     | none                                                                   |

`INDIEAUTH_ENDPOINT` is a public Worker variable in `wrangler.toml`, not a secret.

## 6. DNS records

Add at Cloudflare DNS (the apex `A` records auto-link to Pages once the custom domain is added):

```
hypertext.studio.       A     192.0.2.1            ; managed by Pages
hypertext.studio.       AAAA  2001:db8::1          ; managed by Pages
hypertext.studio.       TXT   "studio:if this work is worth doing, it is worth doing right"
hypertext.studio.       MX    10 route1.mx.cloudflare.net   ; Email Routing
hypertext.studio.       MX    20 route2.mx.cloudflare.net
hypertext.studio.       MX    30 route3.mx.cloudflare.net
hypertext.studio.       TXT   "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

The `studio:` TXT record drives the footer's rotating poem (§4.6.4 of the spec). Update it any time at the registrar; cache TTL is 1 hour. No deploy needed.

## 7. Email Routing

In Cloudflare → Email → Email Routing:

- Enable for `hypertext.studio`.
- Add destination: the studio's real inbox.
- Add rule: `hello@hypertext.studio` → that destination.

## 8. Web Analytics

Cloudflare → Analytics → Web Analytics:

- Add site `hypertext.studio` in **server-side / cookie-free** mode.
- No JS injection needed; Cloudflare reads from edge logs.

## 9. Bluesky handle

Bluesky is opt-in at build time. Leave `BLUESKY_HANDLE` blank to keep profile references out of the site, h-card, JSON-LD, colophons, and feeds while retaining AT Protocol discovery. Set it to the account handle when the profile is ready to be public.

1. Sign up at bsky.app (or use an existing account).
2. Settings → Handle → Custom Domain → enter `hypertext.studio`.
3. Bluesky shows a DID (looks like `did:plc:...`).
4. Update `public/.well-known/atproto-did` with the DID on a single line, no markup.
5. Push, redeploy, then click "Verify" in Bluesky settings.

## 10. Bridgy Fed (ActivityPub)

1. Visit `https://fed.brid.gy/` and submit `https://hypertext.studio/`.
2. Bridgy Fed reads the `h-card` and `rel=me` links and creates a fediverse actor at `@hypertext.studio@hypertext.studio`.
3. Anyone on Mastodon/Pixelfed/Pleroma can search that handle and follow.

The `public/.well-known/webfinger` and the `h-card` on the home page are already in place.

## 11. GitHub Actions secrets

Bootstrap configures these in Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN` — scoped to Pages + Workers + D1
- `CLOUDFLARE_ACCOUNT_ID` — discovered from the repo-bound Wrangler profile

For `CLOUDFLARE_API_TOKEN`, bootstrap walks through the custom-token permissions required by this repository: account-level Cloudflare Pages Edit, Workers Scripts Edit, D1 Edit, and Account Settings Read, plus zone-level Workers Routes Edit restricted to `hypertext.studio`.

After this, every push to `main` deploys to production; every PR gets a Pages preview.

## 12. Verify

```sh
curl -I https://hypertext.studio/                        # 200 with strict headers
curl    https://hypertext.studio/api/poem                # { "poem": "..." }
curl    https://hypertext.studio/.well-known/atproto-did # the DID
make verify-rels                                          # rel=me reciprocity
make embeds                                               # validator URLs
```

## Recovery

- **Bad deploy.** Pages keeps every deploy; rolling back is one click in the dashboard.
- **D1 corruption.** `wrangler d1 export hypertext-studio` for backup; restore via `wrangler d1 execute --file backup.sql`.
- **Lost DNS poem.** The fallback in `src/i18n/en.json#footer.poem.fallback` ships in the build, so nothing breaks visually.
