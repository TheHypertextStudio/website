# Deployment and rollback

## Current status

The company frontend runs on Workers Static Assets at `hypertext.studio`, served by `hypertext-studio-site`. Validation CI does not deploy; the separate staging workflow deploys its verified output after successful main-branch CI. Production publication uses the approved native CLI operation. The previous Pages deployment awaits retirement after cutover acceptance, with no fixed waiting period.

The earlier custom candidate, promotion and `staging-recovery` workflows have been removed. Use the pinned Wrangler CLI and Cloudflare's native version/deployment history.

## Build and inspect locally

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview:worker
```

Astro produces `dist/`. `wrangler.jsonc` serves that output directly. CI retains this same directory as a standard Actions artifact and runs the existing artifact browser checks against it. `_headers` and `_redirects` are maintained in `public/` and copied by Astro.

## Staging

The `Deploy staging` workflow uses the existing `staging` environment credential, scoped to `hypertext-studio-site-staging`. It downloads `dist/` from the successful main-branch CI run and invokes native Wrangler. Pull requests and failed CI runs do not deploy. A native GitHub main-ref read immediately before Wrangler rejects obsolete queued or retried revisions. Deployments are serialized. There is no production option.

`staging.hypertext.studio` uses Cloudflare Access with the existing Google Workspace identity provider and the reusable `Hypertext Studio website previews` policy, allowing authenticated `@hypertext.studio` staff. Workers.dev and version preview URLs remain disabled. Staging routes are intentionally omitted from Wrangler configuration so deployment preserves the existing custom domain without requiring zone permissions.

For an authorized local staging deployment from reviewed source:

```sh
pnpm run deploy:worker --env staging
pnpm exec wrangler deployments list --config wrangler.jsonc --env staging
```

Run deployment from reviewed source after ordinary CI succeeds. Confirm the selected Cloudflare account is Hypertext Studio. Preserve the existing staging route and Access protection. Record the native deployment/version IDs in the release notes, then review actual pages, redirects, assets and headers at the staging hostname.

The reusable Access policy is `2fddfb97-c128-4226-b4e6-8e7e97a0d07e`; Studio's Access application is `79db268c-2596-45e7-a69f-8c8a445d799c`. These are configuration identifiers, not credentials. Other company staging hosts should use this same staff policy and identity provider. The first ordinary staging deployment passed in [run38175180162](https://github.com/TheHypertextStudio/website/actions/runs/38175180162). Authenticated homepage/About rendering, canonical redirects, asset delivery and headers were observed, and a native version rollback served the retained homepage before restoring the new version. Complete staged journeys remain required; an anonymous login redirect alone does not prove the website works.

## Production deployment

Review accepted staging output, production DNS, TLS and route ownership before publication. The frontend owns the `hypertext.studio/*` route. The separate `www`, `poem`, Webmention, Micropub and oEmbed Workers retain their more-specific routes and data. During the initial cutover, the frontend Worker route takes precedence over the proxied apex DNS record pointing at Pages. Before retiring Pages, remove that DNS dependency using supported Workers routing and confirm canonical-domain serving again.

After production approval, use the same pinned build tools and native Wrangler command:

```sh
pnpm run deploy:worker --env production
```

A future automated deployment should use a conventional GitHub Actions deployment job with a protected production environment, scoped provider credentials and concurrency control. There is no custom manifest, recovery journal, activation variable or second package format to introduce.

## Confirm the serving version

After a deployment or rollback, confirm the version that handles actual canonical-domain requests through Cloudflare's native runtime logs. A deployment history entry records the selected traffic configuration; it does not establish which version handled a particular request during the transition. Correlate acceptance requests with their runtime events and require the intended `scriptVersion.id`. Compare the delivered pages and assets with the reviewed build as well.

Allow a bounded settling period before the acceptance batch. If any acceptance request still reaches another version, rollout acceptance remains incomplete. A successful request on the new version must not hide a failed request on that same version. Use native observability and existing build output; no public release-identity endpoint or custom acceptance runner is required.

Inspect bindings on the selected version when verifying rollback. The generic script settings endpoint describes the latest uploaded version, which can differ from the version currently selected for traffic. Confirm both the selected version and its bindings before reviewing public behavior. Stop temporary diagnostic tails and remove temporary local debug settings after diagnosis; debug logging is not runtime acceptance.

## Native Worker rollback

Inspect the version history and choose the previously accepted version:

```sh
pnpm exec wrangler deployments list --config wrangler.jsonc --env production
pnpm exec wrangler versions list --config wrangler.jsonc --env production
pnpm exec wrangler rollback <previous-version-id> --config wrangler.jsonc --env production
```

For staging, select `--env staging`. Cloudflare documents [native rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/). Worker version rollback does not restore DNS, route ownership, databases or external services. If the initial cutover changes routing, reverse that specific provider change to the recorded previous host as part of the approved rollback.

While Pages remains available, reversal of the initial migration removes only the new frontend catch-all route to return traffic to Pages. Preserve every pre-existing service route. Once canonical-domain serving and the migration's affected behavior are accepted, retire the superseded hosting and its remaining DNS and deployment dependencies. These sites are unlaunched; there is no mandatory 24-hour observation period or 14-day recovery window. Retain source and build configuration for redeployment, and use native Worker version rollback once an accepted previous version exists. Removing the frontend route after Pages retirement is no longer a valid reversal.
