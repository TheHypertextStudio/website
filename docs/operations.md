# Operations

## Local services

`make dev-all` starts the site plus all five staging Worker configurations from the repository root:

| URL                            | Service                           |
| ------------------------------ | --------------------------------- |
| `https://hypertext.localhost`  | Astro site                        |
| `https://www.localhost`        | Canonical redirect                |
| `https://poem.localhost`       | `GET /api/poem`                   |
| `https://webmention.localhost` | Webmention receive/list endpoints |
| `https://micropub.localhost`   | Micropub config/publish endpoint  |
| `https://oembed.localhost`     | oEmbed endpoint                   |

Interrupting the command stops every child process.

The supervisor gives every Worker its own inspector port and persistence directory. Optional local Worker secrets belong in an ignored `.dev.vars.<environment>` file, such as `.dev.vars.micropub`; the shared site `.env` is never injected into Worker runtimes.

## Health and logs

```sh
./bootstrap worktree check
pnpm check
pnpm exec wrangler tail --config workers/webmention/wrangler.toml --env production
pnpm exec wrangler tail --config workers/micropub/wrangler.toml --env production
BASE_URL=https://hypertext.studio bash scripts/smoke.sh
```

Worker observability is enabled on the production configuration for each supporting service.

## Webmention moderation

Only verified mentions persist after automated verification. To hide a verified mention:

```sh
pnpm exec wrangler d1 execute hypertext-studio --config workers/webmention/wrangler.toml --env production --remote \
  --command "UPDATE webmentions SET status = 'rejected' WHERE id = <id>"
```

To inspect recent verified mentions:

```sh
pnpm exec wrangler d1 execute hypertext-studio --config workers/webmention/wrangler.toml --env production --remote \
  --command "SELECT id, source, target, mention_type, received_at FROM webmentions WHERE status = 'verified' ORDER BY received_at DESC LIMIT 100"
```

## Credentials

- Rotate Micropub publishing: `pnpm exec wrangler secret put GITHUB_TOKEN --config workers/micropub/wrangler.toml --env production`.
- Refresh local Cloudflare authentication through the repository's named Wrangler profile. Provider setup is separate from checkout preparation and must not create or update routes without an approved release operation.
- Never place provider tokens in `.env`, generated types, command arguments, or committed documentation.

## Deployment history

Use native Wrangler deployment/version history and the Cloudflare dashboard. See [deployment and rollback](deployment.md). The one-off inventory workflow and recovery script have been retired; dated migration evidence is historical.

## Optional identities

Blank social variables are the supported default. To add a Bluesky domain identity, set both the repository Actions variable `BLUESKY_DID` and, when the profile should be public, `BLUESKY_HANDLE`; run the production workflow and verify the resulting well-known endpoint before completing provider verification.
