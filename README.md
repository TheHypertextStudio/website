# Hypertext Studio — `hypertext.studio`

The studio's public face. A small design lab building sustainable, human-centered software.

This is a static [Astro](https://astro.build) site that ships to Cloudflare Pages, with four small Cloudflare Workers handling the indie-web edges (DNS-poem fetch, webmentions, Micropub, oEmbed).

---

## Quickstart

```sh
make bootstrap   # one-shot setup: prereqs, deps, env, optional cloud + github
make dev         # boot the local dev server (http://localhost:4321)
```

That's it. Run `make help` for the full list of tasks.

---

## Requirements

- **Node ≥ 24** (use [`fnm`](https://github.com/Schniz/fnm) or `nvm` to match `.nvmrc`)
- **pnpm ≥ 10** (auto-activated via [Corepack](https://nodejs.org/api/corepack.html))
- Optional: `wrangler` (auto-installed via `pnpm dlx`), `gh` CLI, `jq`

`make doctor` prints a non-mutating health check any time.

---

## Repo layout

```
website/
├── public/                  static assets (fonts, favicons, .well-known, _headers)
├── src/
│   ├── components/          .astro components (Footer/, ProductCard, Citations, Colophon, …)
│   ├── content/             MDX studies + notes (the public corpus)
│   ├── data/                products.json, lineage.json, palette.json
│   ├── i18n/                en.json — all user-facing strings
│   ├── layouts/             Base.astro
│   ├── lib/                 small build-time helpers (e.g. webmentions fetch)
│   ├── pages/               routes (index, privacy, 404, studies/[slug], notes/[slug], …)
│   ├── scripts/             client-side TS (≤200 LOC total)
│   └── styles/              tokens, base, typography, motifs, print, components
├── workers/                 four Cloudflare Workers (poem, webmention, micropub, oembed)
├── scripts/                 bash dev tooling (bootstrap, doctor, build, deploy, …)
├── docs/                    architecture, deployment, content, operations, indieweb
├── tests/                   vitest unit + Playwright e2e + axe a11y + content fixtures
└── .githooks/               pre-commit, commit-msg, pre-push
```

---

## Day-to-day commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `make dev`         | Site via Portless (`https://hypertext.localhost`)         |
| `make dev-astro`   | Raw Astro dev on `http://localhost:4321` (no Portless)    |
| `make dev-all`     | Site + all four workers under `*.localhost` subdomains    |
| `make build`       | Production build (Astro + content-id + word count)        |
| `make preview`     | Build, then serve locally                                 |
| `make typecheck`   | `astro check` + `tsc --noEmit`                            |
| `make lint`        | Prettier check + ESLint + `astro check`                   |
| `make lint-fix`    | Auto-fix Prettier + ESLint                                |
| `make test`        | Vitest unit                                               |
| `make test-e2e`    | Playwright e2e (palette, dialogs, print, …)               |
| `make quality`     | `format-check + lint + typecheck + test` (CI gate)        |
| `make audit`       | Lighthouse + axe + W3C HTML + Schema.org validators       |
| `make embeds`      | Print embed validator URLs (FB, X, LinkedIn, Discord, …)  |
| `make verify-rels` | Confirm `rel=me` reciprocity (GitHub, Bluesky, fediverse) |
| `make new-study`   | Scaffold a new MDX study: `make new-study TITLE="…"`      |
| `make icons`       | Regenerate the `§` favicon set                            |
| `make og`          | Regenerate templated OG images                            |
| `make deploy`      | Preview deployment to Cloudflare Pages                    |
| `make deploy-prod` | Production deployment (Pages + workers)                   |
| `make doctor`      | Non-mutating health check                                 |
| `make clean`       | Remove `dist`, `.astro`, `.wrangler`                      |
| `make nuke`        | Clean + remove `node_modules`                             |

Run `make help` for the categorised version.

---

## Documentation

- [`docs/mission.md`](docs/mission.md) — the studio's posture; the tiebreaker
- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit together
- [`docs/deployment.md`](docs/deployment.md) — Cloudflare Pages + Workers + DNS + Bluesky
- [`docs/content.md`](docs/content.md) — how to write and publish a study or note
- [`docs/operations.md`](docs/operations.md) — DNS poem, status panel keys, webmention runbooks, VoiceOver checklist
- [`docs/indieweb.md`](docs/indieweb.md) — IndieWeb tier 3 conformance + posture

The build spec lives outside the repo and is referenced from `docs/architecture.md`.

---

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by `commit-msg` hook).
- Pre-commit runs `lint-staged` (Prettier + ESLint on staged files).
- Pre-push runs `typecheck + build` so CI rarely fails on a push.
- Every user-facing string lives in `src/i18n/en.json`. No hardcoded copy in templates.
- All directional CSS uses logical properties (`padding-inline`, `margin-block`, …).
- `make help` is the source of truth for tasks.

---

## License

[MIT](LICENSE) © 2025–2026 Hypertext Studio
