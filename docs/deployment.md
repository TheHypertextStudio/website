# Deployment and rollback

## Current status

The company website is moving from Pages to Workers Static Assets. Production cutover, domain changes and deployment credential setup remain separate pending operations. Validation CI does not deploy.

The earlier custom candidate, promotion and `staging-recovery` workflows have been removed. Use the pinned Wrangler CLI and Cloudflare's native version/deployment history.

## Build and inspect locally

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview:worker
```

Astro produces `dist/`. `wrangler.jsonc` serves that output directly. CI retains this same directory as a standard Actions artifact and runs the existing artifact browser checks against it. `_headers` and `_redirects` are maintained in `public/` and copied by Astro.

## Staging

Once the staging credential and hostname are available:

```sh
pnpm run deploy:worker --env staging
pnpm exec wrangler deployments list --config wrangler.jsonc --env staging
```

Run deployment from reviewed source after ordinary CI succeeds. Confirm the selected Cloudflare account is Hypertext Studio. Preserve the existing staging route and Access protection. Record the native deployment/version IDs in the release notes, then review actual pages, redirects, assets and headers at the staging hostname.

## Production cutover

Production remains on its current host until staging is accepted and the cutover is approved. Review current DNS, TLS, route ownership and the existing Pages deployment before cutover. The separate `www`, `poem`, Webmention, Micropub and oEmbed Workers retain their existing routes and data.

The approved operation uses the same pinned build tools and native Wrangler command:

```sh
pnpm run deploy:worker --env production
```

A future automated deployment should use a conventional GitHub Actions deployment job with a protected production environment, scoped provider credentials and concurrency control. There is no custom manifest, recovery journal, activation variable or second package format to introduce.

## Native Worker rollback

Inspect the version history and choose the previously accepted version:

```sh
pnpm exec wrangler deployments list --config wrangler.jsonc --env production
pnpm exec wrangler versions list --config wrangler.jsonc --env production
pnpm exec wrangler rollback <previous-version-id> --config wrangler.jsonc --env production
```

For staging, select `--env staging`. Cloudflare documents [native rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/). Worker version rollback does not restore DNS, route ownership, databases or external services. If the initial cutover changes routing, reverse that specific provider change to the recorded previous host as part of the approved rollback.

Keep the existing Pages deployment available until the production observation window is complete. Retiring old hosting is a separate operation.
