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

The existing `eslint-plugin-jsx-a11y` peer range excludes ESLint 10. Native checks passed, but dependency compatibility remains an explicit integration issue. Actionlint passes when ignoring the deliberate constant-false production job; that disabled job is retained until candidate-based release integration is ready.

## Remaining release gates

Publish the reviewed shared packages, verify read-only registry consumers, regenerate the real frozen lock, and pass hosted CI. Provision isolated supporting resources and a sandbox Micropub repository/token; staging must not write to the company website repository. Capture complete live routing and recovery identities, verify the provider candidate and critical journeys, then promote the approved immutable candidate. Retain the prior host through the plan's observation and recovery periods.
