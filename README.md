# Hypertext Studio website

The company website for Hypertext Studio: Docket, LogDate, Curfew, company information, and the studio's publishing endpoints.

The site is static Astro deployed to Cloudflare Pages. Five Cloudflare Workers provide the `www` redirect, footer poem API, Webmention receiver, Micropub publisher, and oEmbed endpoint. D1 stores verified webmentions.

## Start

```sh
make bootstrap
make dev
```

`make bootstrap` checks prerequisites, installs dependencies, discovers the repository and Cloudflare resources, applies D1 migrations, configures GitHub Actions, and explains every credential it cannot derive.

## Commands

| Command                   | Purpose                                                   |
| ------------------------- | --------------------------------------------------------- |
| `make dev`                | Start the Astro site through Portless                     |
| `make dev-astro`          | Start Astro directly on `127.0.0.1:4321`                  |
| `make dev-all`            | Start the site and all five Workers                       |
| `make build`              | Generate optional metadata and build `dist/` once         |
| `make quality`            | Run formatting, lint, types, unit tests, and Worker tests |
| `make ci`                 | Run the portable CI contract locally                      |
| `make test-e2e-all`       | Run Chromium, Firefox, and WebKit                         |
| `make deploy-preview`     | Explicitly create a Cloudflare Pages preview              |
| `make deploy-break-glass` | Manual production recovery; normal releases use CI        |
| `make doctor`             | Inspect the local toolchain without changing it           |

Run `make help` for the complete task list.

## Release model

GitHub Actions is the only automated production deployment owner. A successful `main` workflow:

1. Runs static, unit, workerd, browser, responsive, and accessibility checks.
2. Builds one immutable `dist` artifact.
3. Applies versioned D1 migrations.
4. Deploys all five Workers.
5. Deploys the verified Pages artifact without rebuilding it.
6. Smoke-tests the live endpoints.

Cloudflare's Git build integration should remain disabled. `make deploy-break-glass` exists only for an operator-directed recovery.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Operations](docs/operations.md)
- [Content](docs/content.md)
- [IndieWeb endpoints](docs/indieweb.md)
- [Site principles](docs/mission.md)

## License

[MIT](LICENSE)
