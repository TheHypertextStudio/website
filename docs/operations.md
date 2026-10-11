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
./run doctor
./run check
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
- Refresh local Cloudflare authentication through the repository's named Wrangler profile. Provider setup is separate from `./run setup` and must not create or update routes without an approved release operation.
- Never place provider tokens in `.env`, generated types, command arguments, or committed documentation.

## Read-only Cloudflare recovery inventory

Manually dispatch the existing **CI** workflow on a reviewed website branch with
`cloudflare_recovery_inventory` enabled. Its independent `cloudflare_inventory`
job uses the existing repository Cloudflare secrets in the hosted runner to read
Studio account, zone, Workers route, and Worker custom domain metadata. It checks
account `2500680a3b2b0fe6a011c1c25fed5008` before any request, installs no project
dependencies, runs the synthetic checks before credentials are supplied, and
makes only GET requests. Domain zone IDs and names are retained when supplied by
the API. Push and pull request runs cannot
start this job. No production environment or deployment is involved.

The single `cloudflare-recovery-inventory-<run>-<attempt>` artifact retains
`cloudflare-recovery-inventory.json` for 90 days, including source SHA, branch,
run, and capture time. Read its job result independently of ordinary CI jobs;
ordinary checks keep their existing behavior. Permission, account mismatch,
pagination, and response limit failures stop capture without a partial artifact.
If access is denied, report the missing read permission for review; do not broaden
credentials automatically. An inventory describes resources visible to the
existing token and does not prove that the token can see every account zone.

The first hosted capture succeeded in [run 38115255706](https://github.com/TheHypertextStudio/website/actions/runs/38115255706),
job `cloudflare_inventory`, at source `4ff8690d92e3de75db7e4ad4ef9edd0005453a9a`.
Artifact `cloudflare-recovery-inventory-38115255706-1` records the five existing
supporting route IDs and four Curfew backend custom domains. Its JSON SHA-256 is
`c75f2941d555b285bd1d9926f3268c65e82f2759757b5d01d39dbfa26dcef161`.
In particular, `curfew-staging.hypertext.studio` already belongs to
`curfew-account-platform-staging`; use a separate marketing preview hostname.
The visible zones were `hypertext.studio` and `clearthedocket.com`. LogDate's
canonical DNS ownership still needs reconciliation. This capture does not prove
route restoration. Ordinary CI jobs in the same run failed at frozen dependency
installation because the canonical registry lock remains pending package
publication; the successful inventory job is a separate result.

The helper follows the Cloudflare API references for [account details](https://developers.cloudflare.com/api/resources/accounts/methods/get/),
[zones](https://developers.cloudflare.com/api/resources/zones/methods/list/),
[Workers routes](https://developers.cloudflare.com/api/resources/workers/subresources/routes/methods/list/),
and [Worker domains](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/).
Run its local synthetic checks with
`node --test scripts/ci/capture-cloudflare-inventory.test.mjs`; these make no
provider requests.

## Optional identities

Blank social variables are the supported default. To add a Bluesky domain identity, set both the repository Actions variable `BLUESKY_DID` and, when the profile should be public, `BLUESKY_HANDLE`; run the production workflow and verify the resulting well-known endpoint before completing provider verification.
