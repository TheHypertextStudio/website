# Architecture

## Site

Astro renders a static company website into `dist/`. Pages use semantic HTML, the approved light/dark design tokens, and product ASCII artwork. The browser does not need a JavaScript application shell.

Public studies are selected through `src/lib/published-content.ts`. A study publishes only when its frontmatter explicitly contains `draft: false`. HTML routes, feeds, sitemaps, and machine-readable discovery use the same boundary.

Optional public identity is configured at build time:

- `BLUESKY_HANDLE` enables Bluesky profile and syndication links.
- `BLUESKY_DID` generates `/.well-known/atproto-did`.

Blank values publish nothing.

## Workers

`wrangler.toml` contains five named environments:

| Environment  | Responsibility                                      |
| ------------ | --------------------------------------------------- |
| `www`        | Preserve path/query and redirect to the apex origin |
| `poem`       | Read the optional `studio:` DNS TXT value           |
| `webmention` | Validate and store verified Webmentions in D1       |
| `micropub`   | Authenticate and publish safe Markdown notes        |
| `oembed`     | Return embed metadata for canonical site URLs       |

Public write endpoints use bounded bodies, time-bounded upstream fetches, canonical target validation, and non-executable storage. Pure unit tests cover parsing and failures; `tests/workers/` executes every environment in workerd.

## Data

D1 migrations live in `migrations/`. The production schema contains the webmentions table and its indexes. Failed asynchronous verification removes transient pending rows; verified rows remain available for display or moderation.

Micropub content is committed to `src/content/notes/*.md` through GitHub's Contents API. The token is a Worker secret and is never part of the site build.

## Build and release

`scripts/build.sh` is the single production-build owner. It generates optional public identity, refreshes the Open Graph image, and invokes Astro once.

`.github/workflows/ci.yml` validates every pull request and `main` commit. Only a successful `main` run may enter the protected production environment. The build job uploads the exact `dist` artifact later deployed by the production job. See `docs/deployment.md` for provider setup.
