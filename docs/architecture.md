# Architecture

## Site

Astro renders a static company website into `dist/`. Pages use semantic HTML, the approved light/dark design tokens, and product ASCII artwork. The browser does not need a JavaScript application shell.

Public studies are selected through `src/lib/published-content.ts`. A study publishes only when its frontmatter explicitly contains `draft: false`. HTML routes, feeds, sitemaps, and machine-readable discovery use the same boundary.

Optional public identity is configured at build time:

- `BLUESKY_HANDLE` enables Bluesky profile and syndication links.
- `BLUESKY_DID` generates `/.well-known/atproto-did`.

Blank values publish nothing.

## Workers

The static site and its protocol endpoints are separate Workers. `wrangler.jsonc` configures the Astro assets Worker; each supporting service has an independent `workers/<service>/wrangler.toml` with `staging` and `production` environments:

| Worker       | Responsibility                                             |
| ------------ | ---------------------------------------------------------- |
| Site         | Serve static Astro files through Workers Static Assets     |
| `www`        | Preserve path/query and redirect to the apex origin        |
| `poem`       | Read the optional `studio:` DNS TXT value                  |
| `webmention` | Validate and store verified Webmentions in the existing D1 |
| `micropub`   | Authenticate and publish safe Markdown notes               |
| `oembed`     | Return embed metadata for canonical site URLs              |

Public write endpoints use bounded bodies, time-bounded upstream fetches, canonical target validation, and non-executable storage. Pure unit tests cover parsing and failures; `tests/workers/` executes every environment in workerd.

## Data

D1 migrations live in `migrations/`. The production schema contains the webmentions table and its indexes. Failed asynchronous verification removes transient pending rows; verified rows remain available for display or moderation.

Micropub content is committed to `src/content/notes/*.md` through GitHub's Contents API. The token is a Worker secret and is never part of the site build.

## Build and release

`scripts/build.sh` generates public metadata and images, then builds Astro into `dist/`. Wrangler deploys that output directly through Workers Static Assets using `wrangler.jsonc`. There is no custom site entrypoint, archive assembly or release identity endpoint.

The staging deployment workflow deploys the successful main-branch CI artifact through Wrangler. Production uses a managed Custom Domain and retains the frontend apex route and supporting service routes. Pages is not a publication or recovery dependency. See [deployment and rollback](deployment.md) for native commands and acceptance requirements.
