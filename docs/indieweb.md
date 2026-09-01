# IndieWeb endpoints

The site supports ordinary web publishing primitives without turning the company website into a social application.

## Published markup

Studies and notes use `h-entry`, canonical `u-url`, publication dates, authorship, tags, optional reply targets, and syndication links. RSS, Atom, JSON Feed, Webmention, Micropub, and oEmbed discovery live in `src/components/Head.astro`.

## Webmention

`POST /webmention` accepts URL-encoded `source` and `target` values. The Worker:

1. Bounds the submission body.
2. Requires a canonical HTTPS target on `hypertext.studio`.
3. Confirms the target exists.
4. Deduplicates recent pending or verified submissions.
5. Fetches the source with a timeout and size limit.
6. Verifies the source links to the target and parses its microformats.
7. Persists verified data or deletes the transient pending row.

`GET /webmentions?target=<canonical-url>` returns verified mentions grouped by type. D1 schema changes are versioned under `migrations/`.

## Micropub

`GET /micropub?q=config` advertises supported post types. `POST /micropub` requires an IndieAuth bearer with `create` scope and an exact canonical `me` claim for `https://hypertext.studio/`.

Requests are limited to 64 KiB. User content is escaped and committed as Markdown under `src/content/notes/`; Micropub never writes executable MDX.

## Optional federation identity

Bluesky and AT Protocol identity are build configuration, not assumed public accounts. See `docs/deployment.md` for `BLUESKY_HANDLE` and `BLUESKY_DID`.
