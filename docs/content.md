# Content

## Studies

Create a study with:

```sh
make new-study TITLE="A concrete title"
```

Studies are Markdown or MDX under `src/content/studies/`. Publication fails closed: a study appears in routes, feeds, sitemaps, and machine-readable files only when frontmatter explicitly contains `draft: false`.

| Field          | Type     | Purpose                                      |
| -------------- | -------- | -------------------------------------------- |
| `title`        | string   | Public title                                 |
| `summary`      | string   | Concrete one-sentence description            |
| `publishedAt`  | datetime | Original publication time                    |
| `modifiedAt`   | datetime | Optional meaningful revision time            |
| `author`       | string   | Defaults to Hypertext Studio                 |
| `product`      | enum     | Optional product association                 |
| `tags`         | string[] | Public categories                            |
| `draft`        | boolean  | Must be `false` to publish; defaults to true |
| `timeRequired` | string   | Optional ISO-8601 duration                   |
| `syndicatedTo` | URL[]    | Optional copies elsewhere                    |
| `inReplyTo`    | URL      | Optional source this work answers            |

Keep draft research in source if useful, but never use drafts as current product documentation.

## Notes

Notes live under `src/content/notes/`. Micropub writes `.md` files with `publishedAt`, `tags`, and `syndicatedTo` frontmatter. Manual notes should use the same non-executable Markdown format.

## Review before publishing

- State what was built or learned directly.
- Remove claims the product or company cannot substantiate.
- Avoid generic marketing language.
- Confirm links, headings, keyboard use, screen-reader structure, print, and narrow-screen layout.
- Run `make ci` and `make test-e2e-all`.
