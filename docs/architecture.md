# Architecture

> The page is a document, not an app.

This site is a static [Astro](https://astro.build) build that ships to Cloudflare Pages, plus four small Cloudflare Workers handling the indie-web edges. Nothing in the landing-page request path runs server-side; everything dynamic lives in the workers.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ─ static HTML, ≤200 LOC of vanilla TS for the keyboard      │
│    layer, native <dialog> / popover for product details      │
├──────────────────────────────────────────────────────────────┤
│  Cloudflare Pages  (CDN)                                     │
│  ─ dist/ from `astro build`                                  │
│  ─ _headers  → security policy                               │
│  ─ _redirects → apex / www unification                        │
├──────────────────────────────────────────────────────────────┤
│  Cloudflare Workers  (per route on hypertext.studio)         │
│  ─ /api/poem        DNS TXT lookup, 1h cache                 │
│  ─ /webmention      W3C webmention receive (D1 store)        │
│  ─ /webmentions     list verified mentions for a target      │
│  ─ /micropub        IndieAuth-protected publishing           │
│  ─ /oembed          rich JSON embed payload                  │
├──────────────────────────────────────────────────────────────┤
│  Cloudflare D1                                               │
│  ─ webmentions      verified mentions                        │
│  ─ notes            audit trail of micropub posts            │
└──────────────────────────────────────────────────────────────┘
```

## Static-by-default

Astro's component islands model means every page on this site ships zero JavaScript by default. Interactive layers (the command palette, sequence shortcuts, status-panel ticker) live in `src/scripts/main.ts` (≤200 LOC total) loaded once via a `<script type="module">`.

Studies (when they exist) will use Astro's MDX collection with selectively-hydrated component islands per `client:load`, `client:idle`, or `client:visible`. Only the islands a given study uses ship JavaScript.

## Source layout

```
src/
├── consts.ts           SITE_URL, SITE_NAME, SOCIAL, etc.
├── content.config.ts   Astro content collections (studies, notes)
├── content/            MDX studies + notes (the public corpus)
├── components/
│   ├── Citations.astro the citation list at the foot of each study/note
│   ├── Colophon.astro  POSSE colophon + respond note
│   ├── Footer/         seven-band closing scene
│   ├── HCard.astro     hidden microformats h-card (studio identity)
│   ├── Head.astro      every <head> tag from §5
│   ├── ProductCard.astro / ProductDialog.astro (native <dialog>)
│   ├── CommandPalette.astro
│   └── …
├── data/               JSON: products, lineage, palette, principles
├── i18n/               en.json — all user-facing strings
├── layouts/Base.astro  shared layout
├── lib/
│   └── webmentions.ts  build-time fetch of GET /webmentions
├── pages/
│   ├── studies/[slug].astro  per-study detail route (h-entry)
│   ├── notes/[slug].astro    per-note detail route (h-entry)
│   ├── studies/index.astro   the studies index
│   └── …                     (privacy, colophon, contact, 404, llms-full.txt)
├── scripts/            client-side TS (keyboard, permalinks, status-panel)
└── styles/             tokens → reset → typography → base → layout → motifs → print → global
```

```
workers/
├── poem/index.ts       /api/poem
├── webmention/index.ts /webmention, /webmentions
├── micropub/index.ts   /micropub
├── oembed/index.ts     /oembed
└── shared/
    ├── d1-schema.sql   webmentions + notes tables
    ├── microformats.ts mf2 parsing + mention-type classification
    ├── types.ts        shared bindings + row types
    └── auth.ts         IndieAuth bearer verification
```

```
tests/fixtures/content/   real-shaped MDX used by Playwright; merged into the
                          public collections only when HYPERTEXT_INCLUDE_FIXTURES
                          is set. The public build never sees these files.
```

## Display layer for IndieWeb tier 3

The studio's posture (`docs/mission.md` §3) treats two-way authorship as
the studio's central thesis, not a feature. The display layer is the thesis
made visible at the foot of every page.

```
                  ┌─────────────────────────────────────────────┐
  someone's blog →│  POST /webmention   → D1 (status=pending)   │
                  │  worker verifies, parses mf2,               │
                  │  classifies type    → D1 (status=verified,  │
                  │                            mention_type=…)  │
                  └─────────────────────────────────────────────┘
                                    │
                                    ▼
                  ┌─────────────────────────────────────────────┐
  scheduled       │  astro build                                │
  rebuild      →  │   src/lib/webmentions.ts                    │
                  │     fetch GET /webmentions?target=<canonical>│
                  │   src/components/Citations.astro            │
                  │     renders typeset citation list +         │
                  │     aggregate "Liked by N · Reposted by N"  │
                  │   src/components/Colophon.astro             │
                  │     renders POSSE colophon + respond note   │
                  │  → static HTML on Cloudflare Pages          │
                  └─────────────────────────────────────────────┘
```

The page is rendered statically; there is no client-side JS for the citation
section, no skeleton flash, no polling. New citations appear on the next
deploy after they're received and verified — see "Static-by-design webmention
freshness" below.

For the conceptual frame (why citation register, why no comment form, why
no facepile), see `docs/indieweb.md`.

## Static-by-design webmention freshness

The build fetches webmentions at build time and inlines them. Mentions
appear on the site only on the next deploy. This is a deliberate choice,
not a limitation:

- The site is a document. Documents update by republishing.
- Real-time chat is the wrong cognitive model for a studies index that
  expects readers to spend twenty minutes on a single page.
- The build-time fetch keeps the production page weight at zero JS for
  citations.

The cadence is whatever the deployment pipeline runs at — daily on the
existing GitHub Actions cron, plus on every push. To trigger an out-of-band
rebuild after a notable mention, run `make deploy-prod` (or trigger a
manual Pages build via the Cloudflare dashboard).

## Build pipeline

`make build` runs `scripts/build.sh`, which:

1. Stamps build identity into `.env.local` (`PUBLIC_BUILD_HASH`, `PUBLIC_BUILD_TIME`, `PUBLIC_DEPLOY_REGION`, `PUBLIC_PAGE_COUNT`) — these surface in the footer status panel.
2. Generates the typographic `§` favicon set if missing.
3. Generates the default OG image if missing.
4. Runs `astro build` → `dist/`.
5. Walks `dist/**/*.html` and counts words → `PUBLIC_WORD_COUNT`.

## Deploy

`make deploy` (preview) or `make deploy-prod` (production):

- `dist/` → Cloudflare Pages via `wrangler pages deploy`.
- `workers/<name>/` → `wrangler deploy --env <name>` per worker.

CI runs the same flow on push (see `.github/workflows/`).

## Reference

- The full build spec lives in the studio's notes (kept outside the repo while it stabilizes).
- `docs/deployment.md` covers Cloudflare Pages + Workers + DNS + Bluesky setup.
- `docs/operations.md` covers ongoing tasks: rotating the DNS poem, status-panel keys, manual VoiceOver checklist.
