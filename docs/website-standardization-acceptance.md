# Website standardization source checkpoint

This records local acceptance for the Studio frontend migration. Production remains on Pages; this checkpoint does not authorize a hosting cutover.

## Tooling and artifact

The lifecycle is pinned to published release-engineering v0.1.7, revision `0e6c0313904316e893a8e606a2557f016571412e`, archive SHA-256 `016e239daa6c30d48198648d97d36f52ad5d28fb3c04cc4cd67a1700d30fa6ad`. Node 24.20.0, pnpm 11.9.0, and Wrangler 4.127.1 were used in an isolated source consumer.

The shared frontend config was installed from its reviewed local tarball. Frozen installation succeeded for that overlay. The repository lock intentionally does not claim an unpublished registry resolution; regenerate it from the actual registry release before merging or claiming fresh-checkout CI acceptance.

## Observed local acceptance

- Complete formatting, lint, Astro and TypeScript checks passed. Astro reported 43 files without errors, warnings, or hints.
- All 146 unit tests and nine supporting Worker tests passed. The supporting tests ran in workerd.
- The production candidate build generated eleven pages. Ten artifact browser scenarios passed through Workers Static Assets, including security and cache headers, association and discovery files, mobile navigation, branded 404s, and permanent trailing-slash redirects with encoded queries preserved.
- The D1 migration preflight now separates pnpm status output from JSON and rejects failed or invalid provider responses before writes. A fresh isolated database applied its migration; a separate legacy database retained its synthetic row while adding `mention_type`.

Actionlint passes when ignoring the deliberate constant-false production job; that disabled job is retained until candidate-based release integration is ready.

## Accessibility dependency compatibility

The product now pins `eslint-plugin-astro` 3.2.1 and its supported `eslint-plugin-jsx-a11y-x` 0.2.0 backend. Published metadata declares ESLint 10 support; the previous `eslint-plugin-jsx-a11y` 6.10.2 peer supported only ESLint 3 through 9. The shared config, ESLint 10.9.1 and accessibility rule settings remain unchanged. [Astro 3.2.1 documents both backends](https://github.com/ota-meshi/eslint-plugin-astro/blob/v3.2.1/README.md#installation) and uses its native adapter for the selected backend; [the selected backend declares ESLint 9 and 10 peers](https://github.com/es-tooling/eslint-plugin-jsx-a11y-x/blob/v0.2.0/package.json).

An independent consumer outside checkout ancestors prevents accidental resolution of the old plugin. Native `pnpm peers check` failed for the previous composition and passed for the selected packages. Frozen installation also passed. All 36 available accessibility rules and all 30 currently enabled rule IDs and severities were retained; the 35-entry recommended preset was unchanged. Sixteen focused Astro examples produced matching diagnostics, including sixteen negative errors and accepted valid image and label examples. All 130 tracked Studio JS, TypeScript and Astro files passed the unchanged product lint config with zero errors and warnings. This focused corpus does not establish exhaustive semantic parity for arbitrary input.

Broad lint now excludes the isolated tooling checkouts (`.superpowers`, `.studio-engine`, `.studio-source`, `.claude/worktrees`) and generated `build` artifacts, matching the existing Git and formatter scopes. Product sources remain checked. Three new regression tests first reproduced the tooling and generated-output failures, then passed while asserting the exact enabled accessibility rules and real failing diagnostics.

With the selected backend installed locally, the normal root `pnpm check` passed: formatting, broad lint, Astro and TypeScript checks, all 149 unit tests and nine supporting Worker tests. Astro reported 43 files with zero errors, warnings or hints. Nine inventory-capture Node tests also passed separately. The canonical lock was restored byte-for-byte after temporary native tarball installation; no workspace override remains. Its historical optional-peer receipts still require replacement by a fresh registry graph before frozen-checkout acceptance.

Context7 documentation retrieval remains blocked by its monthly quota; the compatibility evidence uses exact published registry metadata and package source. The dependency source issue is resolved, while canonical registry lock regeneration and fresh hosted acceptance remain pending the actual shared package publication. No fabricated registry entry or local tarball override is committed.

## Remaining release gates

Publish the reviewed shared packages, verify read-only registry consumers, regenerate the real frozen lock, and pass hosted CI. Provision isolated supporting resources and a sandbox Micropub repository/token; staging must not write to the company website repository. Capture complete live routing and recovery identities, verify the provider candidate and critical journeys, then promote the approved immutable candidate. Retain the prior host through the plan's observation and recovery periods.
