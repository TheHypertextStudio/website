# IndieWeb

The studio's mission (`docs/mission.md` §3) treats the IndieWeb integration
as central to its thesis, not a feature it bolts on. This document explains
what the studio ships, what it doesn't, and why.

> The mainstream web kept the cheapest technical part of hypertext — one-way
> URLs — and dropped the richer parts: bidirectionality, fine-grained
> addressability, two-way authorship, persistent versioning, and the
> social-contract layer that Nelson cared about most. Who gets credit. What
> persists. How consent and authorship work. What the contract between
> author and reader is.
>
> The studio is recovering that abandoned layer in the form of products.
> — `docs/mission.md` §3

The website's IndieWeb integration is the studio's prose answer to that
section. The citation list at the foot of every study, the syndication
colophon, and the visible respond note are not features. They are the
abandoned layer made visible.

## Conformance

The site meets the [IndieWeb Level 3](https://indieweb.org/level) criteria.
The mapping below points each requirement at the file or component that
implements it.

### Identity

| Requirement                                                                              | Where                                                                |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `rel="me"` reciprocity to GitHub, Bluesky, fediverse, email                              | `src/components/Footer/Identity.astro`, `src/components/HCard.astro` |
| `h-card` with `p-name`, `u-url`, `u-uid`, `u-photo`, `u-email`, `p-locality`, `p-region` | `src/components/HCard.astro` (rendered hidden in `Base.astro`)       |
| Verified by `make verify-rels`                                                           | `scripts/verify-rels.sh`                                             |

### Content markup

| Requirement                                                                                                                                               | Where                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `h-entry` on every published study                                                                                                                        | `src/pages/studies/[slug].astro` |
| `h-entry` on every published note                                                                                                                         | `src/pages/notes/[slug].astro`   |
| `p-name` on title, `p-summary` on lede, `e-content` on body, `dt-published` on dateline, `p-author` linked to the studio's `h-card`, `p-category` on tags | both `[slug].astro` routes       |
| `u-in-reply-to` when frontmatter declares `inReplyTo`                                                                                                     | both `[slug].astro` routes       |
| `u-syndication` on each POSSE link in the colophon                                                                                                        | `src/components/Colophon.astro`  |
| `u-url` self-reference on each post                                                                                                                       | both `[slug].astro` routes       |

### Receiving

| Requirement                                                                                                                          | Where                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `<link rel="webmention" href="/webmention" />`                                                                                       | `src/components/Head.astro`    |
| W3C Webmention `POST /webmention` endpoint                                                                                           | `workers/webmention/index.ts`  |
| `GET /webmentions?target=…` returning verified mentions grouped by type                                                              | `workers/webmention/index.ts`  |
| Async verification: fetch source, validate it links to target, parse mf2, classify type                                              | same file, `verify()` function |
| Storage: D1 `webmentions` table, `status ∈ {pending, verified, rejected}`, `mention_type ∈ {reply, like, repost, bookmark, mention}` | `workers/shared/d1-schema.sql` |

### Display

| Requirement                                                           | Where                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Visible citation list on each post                                    | `src/components/Citations.astro`                                          |
| Aggregate row for likes / reposts / bookmarks (no facepile)           | same component                                                            |
| POSSE colophon: "First published / Also at / Last revised / Cited by" | `src/components/Colophon.astro`                                           |
| Plain "how to respond" note on every published page                   | same component (text in `src/i18n/en.json#indieweb.colophon.respondNote`) |

### Publishing

| Requirement                                              | Where                       |
| -------------------------------------------------------- | --------------------------- |
| Micropub endpoint `POST /micropub` (IndieAuth-protected) | `workers/micropub/index.ts` |
| Micropub config endpoint `GET /micropub?q=config`        | same file                   |
| `<link rel="micropub" href="/micropub" />`               | `src/components/Head.astro` |
| Audit trail of published notes                           | D1 `notes` table            |

### Syndication

| Requirement                                           | Where                           |
| ----------------------------------------------------- | ------------------------------- |
| `syndicatedTo` frontmatter array on studies and notes | `src/content.config.ts`         |
| Visible POSSE trail in the colophon ("Also at" rows)  | `src/components/Colophon.astro` |
| Bridgy Fed bridge announced via `rel="me"`            | `src/components/HCard.astro`    |

### Discovery

| Requirement                                       | Where                                                |
| ------------------------------------------------- | ---------------------------------------------------- |
| RSS, Atom, JSON Feed, oEmbed declared in `<head>` | `src/components/Head.astro`                          |
| Sitemap                                           | `@astrojs/sitemap` integration in `astro.config.mjs` |

## What we deliberately don't ship

The mission's anti-pattern list (`docs/mission.md` §9) and posture rules (§8)
exclude several patterns common on IndieWeb sites:

- **No comment form.** The respond note in the colophon explains how to
  respond via your own site or via Bluesky / fediverse. The form's absence
  is the editorial statement.
- **No facepile or avatars.** The author's name is the author. Aggregate
  rows show counts; the disclosure expands to a typeset list of names, not
  a row of profile photos.
- **No threaded replies.** Citations are flat and chronological — a
  bibliography, not a conversation tree.
- **No likes / hearts / "appreciation" microcopy.** The aggregate row reads
  "Liked by N", "Reposted by N", "Bookmarked by N" — bare counts, no
  superlatives.
- **No real-time chat.** The page is a document; documents update by
  republishing. See `docs/architecture.md` "Static-by-design webmention
  freshness" for the cadence.

## Testing your own webmention

To verify the endpoint works against your site:

1. Publish a post on your own site with a link to a page on
   `hypertext.studio` (e.g., a study URL).
2. Either let your site auto-discover and send the webmention, or use
   [webmention.rocks](https://webmention.rocks/) to send a manual one.
3. The worker accepts and verifies asynchronously. To watch:
   ```sh
   pnpm exec wrangler tail --env webmention
   ```
4. Once verified, the mention appears on the target page on the next
   deploy. To verify it's stored:
   ```sh
   pnpm exec wrangler d1 execute hypertext-studio --env webmention \
     --command "SELECT * FROM webmentions WHERE source = '<your post URL>'"
   ```

For development against a local worker, see `docs/operations.md` "Local dev
URLs (Portless)".

## For maintainers: extending classification

The `MentionType` union in `workers/shared/microformats.ts` is the single
source of truth for mention types. To add one (e.g., `rsvp`):

1. Add `'rsvp'` to the `MentionType` union.
2. Add `['rsvp', 'rsvp']` to `TYPE_TO_PROPERTY` in the same file. The
   second element is the microformats property name without the
   `u-` / `p-` prefix.
3. Update the D1 schema's `mention_type` comment and add an index migration
   if needed.
4. Update the worker's `GET /webmentions` grouping to surface the new type
   in the response shape.
5. Update `src/lib/webmentions.ts`'s `WebmentionGroups` interface.
6. Decide whether the new type renders as a citation (replies / mentions),
   an aggregate count (likes / reposts / bookmarks), or something new.
7. Update `Citations.astro` accordingly. Add an i18n key under
   `src/i18n/en.json#indieweb.citations` for any new visible label.
8. Add a test case to `tests/unit/microformats.test.ts`.

## Parser choice

The worker uses [`microformats-parser`](https://npm.im/microformats-parser)
— a pure-JS mf2 parser that runs in Cloudflare Workers. The bundle is
~73 KiB gzipped, well under the 1 MiB compressed limit.

Why a real parser instead of regex: nested h-cites, implied properties
(e.g., `e-content` derived from element children when no `value` is set),
and absolute-URL resolution against the source's base URL all work
correctly. The earlier regex implementation handled bare-link cases but
broke on richer markup that some IndieWeb senders emit.
