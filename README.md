# Hypertext Studio website

The company website for Hypertext Studio: Docket, LogDate, Curfew, company information, and the studio's publishing endpoints.

## Start here

```sh
./run setup
./run doctor
./run dev
```

The shared lifecycle is pinned in [`studio.lock.json`](studio.lock.json). Setup installs the declared local toolchain and dependencies; it does not create provider resources, change routes, apply remote database migrations, or request secrets. See [configuration](docs/configuration.md) before setting optional values.

## Common commands

| Command             | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `./run setup`       | Prepare the pinned local toolchain and dependencies |
| `./run doctor`      | Check local tools, config, and repository readiness |
| `./run dev`         | Start Astro through Portless                        |
| `./run check`       | Run formatting, lint, type, unit, and Worker checks |
| `./run build`       | Build the immutable website candidate input         |
| `make dev-all`      | Start the site and five supporting Workers locally  |
| `make test-e2e-all` | Run Chromium, Firefox, and WebKit browser checks    |

Read [local development](docs/development.md) for the site and support-service workflows.

## Hosting and services

Astro outputs static files. The website Worker serves that output through Cloudflare Workers Static Assets and reports candidate identity at `/__studio/release`. The five supporting Workers remain independent services: `www`, `poem`, `webmention`, `micropub`, and `oembed`. Their Wrangler configs live beside their source code and distinguish `staging` from `production`.

The existing Webmention D1 database remains bound only to the production Webmention Worker. Micropub's GitHub write token remains a secret on the production Micropub Worker; it is not included in the site Worker, candidate assets, or previews.

## Release status

Local candidate construction and source configuration are in progress. Production cutover is not authorized by this checkout. Candidate workflow integration, complete route/version recovery evidence, provider preview acceptance, and production promotion remain pending. See [deployment and recovery](docs/deployment.md).

## Documentation

- [Configuration](docs/configuration.md)
- [Local development](docs/development.md)
- [Architecture](docs/architecture.md)
- [Deployment and recovery](docs/deployment.md)
- [Operations](docs/operations.md)
- [Content](docs/content.md)
- [IndieWeb endpoints](docs/indieweb.md)
- [Site principles](docs/mission.md)

## Worktree setup

For a fresh checkout, run `./bootstrap worktree prepare`. The pinned Studio bootstrap engine reuses native dependency caches and keeps installed dependencies and mutable build outputs local to this checkout. This command does not build applications or start services. Continue using `./run` for the product lifecycle.

## License

[MIT](LICENSE)
