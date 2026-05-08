# Documentation

Everything you need to build, run, and write for `hypertext.studio`.

## Posture

- [`mission.md`](mission.md) — what the studio is for; the tiebreaker when the spec leaves a decision open

## Setup & operations

- [`architecture.md`](architecture.md) — how the site is put together
- [`deployment.md`](deployment.md) — Cloudflare Pages + Workers + DNS + Bluesky
- [`operations.md`](operations.md) — rotating the DNS poem, status panel keys, webmention runbooks, manual VoiceOver checklist
- [`indieweb.md`](indieweb.md) — IndieWeb tier 3 conformance, posture, and parser choice

## Writing

- [`content.md`](content.md) — how to write and publish a study
- [`content/style-guide.md`](content/style-guide.md) — voice, microcopy, do-not-say list

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by `.githooks/commit-msg`.
- Pre-commit runs `prettier --write` + `eslint --fix` on staged files via `lint-staged`.
- Pre-push runs `make typecheck && make build`.
- The build spec lives outside the repo and is referenced from `architecture.md`.
