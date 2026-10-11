# Hypertext Studio website

The company website for Hypertext Studio: Docket, LogDate, Curfew, company information, and the studio's publishing endpoints.

## Start here

```sh
./bootstrap worktree prepare
pnpm dev
```

Node is pinned in `.nvmrc`; pnpm and the shared frontend packages are pinned in `package.json` and `pnpm-lock.yaml`. See [configuration](docs/configuration.md) for registry authentication and optional values.

## Common commands

| Command                        | Purpose                                               |
| ------------------------------ | ----------------------------------------------------- |
| `./bootstrap worktree prepare` | Prepare a fresh checkout                              |
| `pnpm dev`                     | Start Astro through Portless                          |
| `pnpm check`                   | Run formatting, lint, types and existing tests        |
| `pnpm build`                   | Generate public metadata and build Astro into `dist/` |
| `pnpm preview:worker`          | Serve the built site locally through Wrangler         |
| `make dev-all`                 | Start the site and five supporting Workers locally    |
| `make test-e2e-all`            | Run the existing cross-browser checks                 |

Read [local development](docs/development.md) for the site and support-service workflows.

## Hosting and services

Astro outputs static files. Cloudflare Workers Static Assets serves `dist/` using `wrangler.jsonc`. The static site needs no custom Worker entrypoint. The five supporting Workers remain independent services: `www`, `poem`, `webmention`, `micropub`, and `oembed`. Their Wrangler configs live beside their source code and distinguish `staging` from `production`.

The existing Webmention D1 database remains bound only to the production Webmention Worker. Micropub's GitHub write token remains a secret on the production Micropub Worker; it is not included in the site Worker, site assets, or previews.

## Release status

The Workers migration is in progress. Production cutover and domain changes remain pending. Validation CI builds and checks the site; deployments use native Wrangler commands. See [deployment and rollback](docs/deployment.md).

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

For a fresh checkout, run `./bootstrap worktree prepare`. The pinned Studio bootstrap engine reuses native dependency caches and keeps installed dependencies and mutable build outputs local to this checkout. This command does not build applications or start services. Use the package scripts above for development and builds.

## License

[MIT](LICENSE)
