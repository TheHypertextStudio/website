# Deployment

End-to-end setup for taking `hypertext.studio` from a fresh GitHub repo to live production. Most of these steps run once; after that, `git push` is the deploy trigger.

## Prerequisites

- A Cloudflare account with `hypertext.studio` added as a zone.
- A GitHub account with permission to create `TheHypertextStudio/website`.
- `wrangler` CLI authenticated (`wrangler login`).
- `gh` CLI authenticated (`gh auth login`).

`make bootstrap` walks through these interactively and is safe to re-run.

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
- Add `www.hypertext.studio` and configure a redirect (handled in `public/_redirects`).

## 4. D1 database

```sh
wrangler d1 create hypertext-studio
wrangler d1 execute hypertext-studio --file workers/shared/d1-schema.sql
```

Copy the database ID into `wrangler.toml` (replacing `REPLACE_WITH_REAL_D1_ID`).

## 5. Workers

Each worker has its own environment in `wrangler.toml`. Deploy individually:

```sh
wrangler deploy --env poem
wrangler deploy --env webmention
wrangler deploy --env micropub
wrangler deploy --env oembed
```

Or all at once: `make deploy-workers`.

### Worker secrets

Set per-worker via `wrangler secret put <NAME> --env <worker>`:

| Worker     | Secret(s)                                                 |
| ---------- | --------------------------------------------------------- |
| `micropub` | `GITHUB_TOKEN` (contents:write fine-grained PAT)          |
| `micropub` | `INDIEAUTH_ENDPOINT` (e.g. `https://indielogin.com/auth`) |
| others     | none                                                      |

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

In Settings → Secrets and variables → Actions → New repository secret:

- `CLOUDFLARE_API_TOKEN` — scoped to Pages + Workers + D1
- `CLOUDFLARE_ACCOUNT_ID` — from `wrangler whoami`

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
