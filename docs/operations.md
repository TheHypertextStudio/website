# Operations

The ongoing tasks for keeping `hypertext.studio` healthy.

## Rotating the footer poem

The footer's italic quote is fetched live from a TXT record on `hypertext.studio`. To rotate:

1. Cloudflare → DNS → edit the `studio:` TXT record:

   ```
   studio:if this work is worth doing, it is worth doing right
   ```

   The prefix `studio:` is required; everything after is the displayed text.

2. Cache TTL is 1 hour at the worker plus DNS TTL. No deploy needed.

3. The build also embeds a fallback (in `src/i18n/en.json#footer.poem.fallback`) so if the worker is unreachable or JS is off, the page still renders something coherent.

## Local dev URLs (Portless)

After `make dev-all`, the stack is reachable at:

| URL                            | What                                   |
| ------------------------------ | -------------------------------------- |
| `https://hypertext.localhost`  | The site (Astro)                       |
| `https://poem.localhost`       | `GET /api/poem`                        |
| `https://webmention.localhost` | `POST /webmention`, `GET /webmentions` |
| `https://micropub.localhost`   | `POST /micropub`, `GET ?q=config`      |
| `https://oembed.localhost`     | `GET /oembed?url=…`                    |

Run `pnpm exec portless list` to see active routes. Run `pnpm exec portless trust` once after install to put the local CA in the system trust store.

## Status panel keys

The footer's mission-control panel reads from build-time env vars and runtime APIs:

| Field         | Source                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| `STUDIO TIME` | Live, via `Intl.DateTimeFormat` in the studio's timezone (Pacific).        |
| `LOCATION`    | Static — `Las Vegas, NV`.                                                  |
| `EDGE`        | `cf-ray` header colocode (build-injected; falls back to `local`).          |
| `RENDER`      | `performance.getEntriesByType('navigation')[0].responseEnd - requestStart` |
| `BUILD`       | `PUBLIC_BUILD_HASH` from `scripts/content-id.sh`.                          |
| `DEPLOYED`    | `PUBLIC_BUILD_TIME` from `scripts/content-id.sh`.                          |
| `PAGES`       | `PUBLIC_PAGE_COUNT` — count of files in `src/pages/`.                      |
| `WORDS`       | `PUBLIC_WORD_COUNT` from `scripts/words.sh` against `dist/`.               |

Fields with `PUBLIC_*` vars are stamped into `.env.local` by `scripts/build.sh` and read at build via `import.meta.env`.

## Adding a translation

Per §14:

1. Copy `src/i18n/en.json` → `src/i18n/<locale>.json`.
2. Translate every value. Keys stay identical.
3. Add a route hreflang link in `src/components/Head.astro` for the new locale.
4. Add a `[locale]/...` route group in `src/pages/` if the URL structure should change.

No template edits required. Logical CSS properties handle RTL languages automatically.

## Manual checklist before launch

The 84-criterion list in §19 of the spec maps to either an automated check (covered by `make audit`, `make test`, `make test-e2e`) or one of these manual passes:

- [ ] **VoiceOver pass** on the home page (Cmd+F5 on macOS). Confirm:
  - Heading order is logical
  - The h-card landmark reads cleanly
  - Each footer band is announced as a region
  - The command palette is reachable from Tab + Enter
- [ ] **Keyboard-only nav** through every interactive flow. No mouse.
- [ ] **400% zoom** at 1280×1024. No horizontal scroll, no overlap.
- [ ] **`prefers-contrast: more`** in macOS / Windows. Confirm contrast lifts.
- [ ] **Forced-colors mode** (Windows High Contrast). Borders visible.
- [ ] **Print preview** in Safari, Firefox, Chrome. Compare to PDF.
- [ ] **Reader View** in Safari and Firefox. Page extracts cleanly.
- [ ] **Embed previews:** share the URL in Discord, Slack, iMessage, X, Bluesky, Mastodon, LinkedIn, Facebook. All render rich cards.
- [ ] **Console clean** on every page. No errors, no warnings beyond the configured greeting.
- [ ] **`make verify-rels`** — every rel=me reciprocates.

When every box is ticked, tag and ship: `make release`.

## Common tasks

| Task                               | How                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| Update build hash before deploy    | `bash scripts/content-id.sh`                                                         |
| Recount words after rewrites       | `bash scripts/words.sh`                                                              |
| Regenerate favicons                | `make icons`                                                                         |
| Regenerate default OG image        | `make og`                                                                            |
| Refresh Cloudflare wrangler login  | `pnpm exec wrangler logout && pnpm exec wrangler login`                              |
| Inspect a deployed worker's logs   | `pnpm exec wrangler tail --env <worker>`                                             |
| Roll back a Pages deploy           | Cloudflare dashboard → Deployments → "Rollback"                                      |
| Rotate the GitHub PAT for micropub | `pnpm exec wrangler secret put GITHUB_TOKEN --env micropub`                          |
| Re-apply D1 schema                 | `pnpm exec wrangler d1 execute hypertext-studio --file workers/shared/d1-schema.sql` |

## Webmentions

The webmention worker receives mentions, parses microformats from the
sender's page, classifies the mention type (reply / like / repost / bookmark
/ mention), and stores the result in D1. The static build picks up verified
mentions on the next deploy. Conceptual frame: `docs/indieweb.md`.

### Applying the `mention_type` migration

Existing dev or production D1 databases that pre-date the column need a
one-shot ALTER:

```sh
pnpm exec wrangler d1 execute hypertext-studio --env webmention \
  --command "ALTER TABLE webmentions ADD COLUMN mention_type TEXT NOT NULL DEFAULT 'mention'" \
  --command "CREATE INDEX IF NOT EXISTS idx_webmentions_type ON webmentions(mention_type)"
```

Re-running on a database that already has the column fails with `duplicate
column name: mention_type` — that error is safe to ignore.

A fresh `wrangler d1 execute --file workers/shared/d1-schema.sql` picks up
the column automatically; `CREATE TABLE IF NOT EXISTS` is idempotent.

### Moderating webmentions

The worker stores everything it receives. The `status` column is the
moderation surface (`pending` → `verified` | `rejected`). To mark a verified
mention as rejected (so it disappears from the next built page):

```sh
pnpm exec wrangler d1 execute hypertext-studio --env webmention \
  --command "UPDATE webmentions SET status = 'rejected' WHERE id = <id>"
```

To inspect the verified queue for a target:

```sh
pnpm exec wrangler d1 execute hypertext-studio --env webmention \
  --command "SELECT id, source, mention_type, author_name, received_at \
             FROM webmentions \
             WHERE target = 'https://hypertext.studio/studies/<slug>' \
               AND status = 'verified' \
             ORDER BY received_at DESC"
```

There is no automatic re-verification. To re-fetch a source page after the
sender edited it, manually delete the row and ask the sender to re-send the
webmention.

### Build-time fetch configuration

`src/lib/webmentions.ts` reads `WEBMENTION_API_URL` (or the public alias
`PUBLIC_WEBMENTION_API`) at build time. Defaults to
`https://hypertext.studio/webmentions`.

| Scenario                             | Set this                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Production build                     | leave unset                                                                                      |
| CI build from a fork (no D1 access)  | `WEBMENTION_API_URL=http://127.0.0.1:1/disabled`                                                 |
| Local dev pointing at staging worker | `WEBMENTION_API_URL=https://staging.hypertext.studio/webmentions`                                |
| Test build                           | `HYPERTEXT_INCLUDE_FIXTURES=1`; the API URL is irrelevant when fixtures don't have real mentions |

The fetch is wrapped in a try/catch — any error (DNS, 5xx, malformed JSON)
returns an empty groups object, and the page renders as if there are no
mentions. The build never breaks because of the worker.

### Rebuild cadence

Mentions become visible on the site only on the next deploy. The CI
workflow runs on every push and on a daily cron. To force an out-of-band
rebuild — for example, after a notable mention arrives that should appear
without waiting for the next push:

```sh
make deploy-prod      # full rebuild + Pages publish
```

Or trigger a manual Pages build via Cloudflare dashboard → Workers & Pages →
the project → Deployments → "Retry deployment" on the latest commit.
