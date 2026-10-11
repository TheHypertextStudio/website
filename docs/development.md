# Local development

Prepare a fresh checkout:

```sh
./bootstrap worktree prepare
pnpm dev
```

Node and pnpm versions are pinned in `.nvmrc` and `package.json`. For an existing prepared checkout, use `pnpm install --frozen-lockfile` when dependencies change. Private package authentication is described in [configuration](configuration.md).

Astro runs at `https://hypertext.localhost`. `pnpm dev:astro` starts Astro directly on port 4321. `make dev-all` starts the site and its five supporting Workers on separate local origins using the existing development supervisor.

The supervisor applies migrations only to local Webmention D1 state. Local Micropub credentials belong in the ignored `.dev.vars.micropub` file.

## Checks and builds

```sh
pnpm check
pnpm build
pnpm preview:worker
```

`pnpm build` generates optional public identity metadata and images, then runs Astro. The output is `dist/`. Wrangler serves this directory directly using `wrangler.jsonc`; no second archive or generated deployment configuration is required.

Existing browser checks remain available through `pnpm test:e2e:all` and `pnpm test:artifact`. CI downloads the built `dist/` artifact before running the artifact checks through Wrangler.

Do not edit generated `dist/`, `.astro/` or `.wrangler/` files. Public redirects and headers live in `public/_redirects` and `public/_headers`. Add permanent canonical redirects for new directory routes to `_redirects`.
