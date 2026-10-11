# Local development

Prepare a checkout and verify its local dependencies:

```sh
./run setup
./run doctor
```

Run the Astro authoring server with `./run dev`; it is served at `https://hypertext.localhost`. Run `make dev-all` when working across protocol endpoints. It starts Astro and five supporting Worker processes, each on its own `.localhost` origin. The supervisor creates local Wrangler state under `.wrangler/` and stops all children when interrupted.

The `make dev-all` path applies migrations to local Webmention D1 state only. Remote migrations are a separately authorized provider operation. Micropub secrets are never read from the site's `.env`; for local publishing tests, place any required test credential in the ignored `.dev.vars.micropub` file.

## Checks and builds

```sh
./run check
./run build
make test-e2e-all
```

`./run check` runs the declared source checks. `./run build` creates the static-site candidate input under `build/site-candidate/`; candidate construction is local source validation and does not deploy. `make test-e2e-all` exercises the public site in Chromium, Firefox, and WebKit.

Avoid editing generated files under `dist/`, `.astro/`, `build/`, or `.wrangler/`. The Astro source and Worker entrypoints are the source of truth.
