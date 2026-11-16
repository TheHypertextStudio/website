# Local development

## Quickstart

Installing dependencies needs read access to the Studio's private `@thehypertextstudio` packages (`web-config`, which supplies the shared lint, format and TypeScript settings). Maintainers have it; without it, `pnpm install` stops with an authorization error. An outside contributor can still propose a change: open a pull request, and its checks install, test and build it.

The toolchain is Node 24.20.0 (`.nvmrc`) and pnpm 11.9.0 (`packageManager` in `package.json`, activated by Corepack).

With package access, a fresh clone builds and tests with:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

`pnpm check` runs formatting, linting, type checking and the unit and Worker tests. `pnpm build` writes the site to `dist/`. Run `pnpm dev:astro` to serve the site on port 4321.

## Maintainer setup

Prepare a fresh checkout with the Studio bootstrap:

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
