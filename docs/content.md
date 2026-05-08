# Writing content

Two content types live in `src/content/`: **studies** and **notes**. The schema for each is in `src/content.config.ts`.

## Studies

Long-form research, written alongside major releases of the studio's products. Authored as MDX so they can embed interactive component islands.

### Scaffold

```sh
make new-study TITLE="A study about something"
```

Creates `src/content/studies/<slug>.mdx` with frontmatter:

```yaml
---
title: "A study about something"
summary: "TODO: one-sentence abstract"
publishedAt: "2026-05-04T18:00:00Z"
author: "Hypertext Studio"
draft: true
tags: []
---
```

### Frontmatter fields

| Field          | Type     | Notes                                                                                                                    |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `title`        | string   | Title displayed at the top of the study and in feeds. Renders as `p-name` for h-entry.                                   |
| `summary`      | string   | One-sentence abstract. Used in OG, Twitter, feeds. Renders as `p-summary`.                                               |
| `publishedAt`  | datetime | ISO-8601. The original publication time. Renders as `dt-published`. Surfaces in the colophon as "First published".       |
| `modifiedAt`   | datetime | Optional. Updated when the study is meaningfully revised. Renders as `dt-updated`. Surfaces as "Last revised".           |
| `author`       | string   | Defaults to `Hypertext Studio`.                                                                                          |
| `product`      | enum     | `logdate` \| `curfew` \| `termsly`. Optional.                                                                            |
| `heroImage`    | path     | Path under `public/`. Used for OG images.                                                                                |
| `tags`         | string[] | Taxonomy. Renders as `p-category` chips at the foot of the article.                                                      |
| `draft`        | boolean  | If true, excluded from the build. Default `true`.                                                                        |
| `wordCount`    | number   | Auto-computed at build by `scripts/words.sh`. Don't set by hand.                                                         |
| `timeRequired` | string   | ISO-8601 duration (e.g. `PT12M`). Auto-computed.                                                                         |
| `syndicatedTo` | URL[]    | POSSE: each URL renders in the colophon as an "Also at" row with `u-syndication` markup. Domain identifies the platform. |
| `inReplyTo`    | URL      | If this study itself responds to outside work, render `u-in-reply-to` for IndieWeb sender conformance.                   |

### Interactive components

Embed islands from `src/components/interactive/` with a `client:` directive:

```mdx
import { Slider } from "@/components/interactive/Slider.astro";

<Slider client:visible min={0} max={100} value={42} />
```

Pick the lightest directive that works:

- `client:visible` — hydrate when the component scrolls into view (best for charts and widgets below the fold).
- `client:idle` — hydrate after the page is interactive (good for moderate widgets above the fold).
- `client:load` — hydrate on first paint (only when truly necessary).

Each component must ship a server-rendered fallback so the print stylesheet and Reader View see something coherent.

### Print

Studies print as proper papers. Top-level sections use `break-before: page` so each major section starts on a new sheet. Confirm before publishing:

```sh
make build && pnpm exec serve dist  # then ⌘P in the browser
```

## Notes

Short-form posts, typically published via [Micropub](https://www.w3.org/TR/micropub/) from a third-party client (Quill, Indigenous, micropublish.net). The Micropub worker writes them to `src/content/notes/` and triggers a rebuild.

To author a note manually:

```sh
cat > src/content/notes/2026-05-04-some-note.mdx <<'EOF'
---
publishedAt: 2026-05-04T18:00:00Z
syndicatedTo: []
tags: [aside]
---

The note body, as MDX.
EOF
```

### Notes frontmatter fields

| Field          | Type     | Notes                                                                                                                                  |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `publishedAt`  | datetime | ISO-8601. Required.                                                                                                                    |
| `syndicatedTo` | URL[]    | POSSE syndication targets. Same semantics as on studies.                                                                               |
| `tags`         | string[] | Optional. Renders as `p-category`.                                                                                                     |
| `inReplyTo`    | URL      | Optional. When set, the note's dateline reads "in reply to <domain>" and renders `u-in-reply-to`. Most notes-as-replies will set this. |

## Citations and the colophon

Every study and note carries a citation list and a small POSSE colophon at
the foot of the document. Both are powered by frontmatter and by webmentions
arriving from elsewhere on the web. See
[`indieweb.md`](indieweb.md) for the conceptual frame and the citation-
register choices (no comment form, no facepile, no threading).

## POSSE flow

When a study or note publishes:

1. Build hook scans outbound links and sends webmentions for any
   `inReplyTo` declared in frontmatter.
2. The studio's Bridgy Fed bridge federates the canonical URL to the
   fediverse.
3. An AT-Protocol post (via the studio's PAT) syndicates to Bluesky.

Replies flow back as webmentions. The webmention worker stores them in D1
with a `mention_type` classification (reply / like / repost / bookmark /
mention). Study and note pages render them inline at the next build —
see `architecture.md` "Static-by-design webmention freshness" for the
cadence rationale.
