# Website standardization source checkpoint

This records local acceptance for the Studio frontend migration. Production remains on Pages; this checkpoint does not authorize a hosting cutover.

## Tooling and artifact

The lifecycle now pins published release-engineering v0.1.8, revision `878260def7229cd3df7f752b32e5581230c5db2d`, archive SHA-256 `61f746429fc0ffc7826df2bde61ee4d41323fb5fa0c9f8661255040e7838afd4`. The native pin updater verified the actual published archive and tag; `./run doctor` passed all declared tool/version checks, and `./run build` produced the eleven-page native Workers artifact using the existing local dependency graph. The original artifact acceptance below used v0.1.7, Node 24.20.0, pnpm 11.9.0 and Wrangler 4.127.1 in an isolated source consumer. Fresh registry-backed checkout acceptance remains dependent on product package access and the real registry lock; the actual 0.0.1 tarball acceptance below uses v0.1.8.

The original shared frontend config acceptance used its reviewed local 0.1.0 tarball. The initial 0.0.1 packages are now published, and shared registry verification passed for all four exact package integrities. The actual 0.0.1 shipping acceptance below supersedes the historical tarball input. The repository lock has not been regenerated from that registry release; product package access, the real lock, and hosted CI remain required before claiming fresh registry-checkout acceptance.

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

Context7 documentation retrieval remains blocked by its monthly quota; the compatibility evidence uses exact published registry metadata and package source. The dependency source issue is resolved, while product registry access, canonical registry lock regeneration, and fresh hosted acceptance remain pending. No fabricated registry entry or local tarball override is committed.

## Actual 0.0.1 shipping acceptance

The root website consumed the actual `@thehypertextstudio/web-config@0.0.1` tarball from shared candidate `38116243716-1`, source `a108b4fec7d1fca02fb59afb09237cf9b52a1ca6`, manifest SHA-256 `097bb8cd7f4bb7341bb9bfdc48c79cc0c855a95c3b25a225374c1f9da3f58fa4`. Its tarball SHA-256 is `5950447cc3a49a1fe26f28fb1ef9c3a3e76f6e64ae9bfea47099132db4d870f6`; every installed package file also matches the tarball bytes. [Publication completed](https://github.com/TheHypertextStudio/web-platform/actions/runs/38116605945), and [fresh shared registry consumers passed](https://github.com/TheHypertextStudio/web-platform/actions/runs/38116980056) with all four published integrities matching the reviewed shipping bytes. This local product run used the verified tarball rather than private registry credentials.

A disposable source checkout outside this checkout's ancestors started with no `node_modules`. A genuine temporary file-tarball override and newly resolved lock passed native install, frozen replay, peers, shared `./run setup`, `doctor`, `check`, and `build` under Node 24.20.0 and pnpm 11.9.0. Wrangler remains exactly 4.127.1. Formatting, broad lint, Astro/TypeScript checks, all 149 unit tests, and nine supporting workerd tests passed; Astro reported 43 files without diagnostics. Nine inventory-capture Node tests passed separately. The eleven-page candidate passed all ten existing artifact browser scenarios through Workers Static Assets.

The initial existing-graph check reproduced the obsolete optional accessibility peer receipt. An independent fresh graph removed that receipt but exposed three broad source ranges selecting unsupported newer tools: Playwright 1.64.0, ESLint 10.12.0, and Prettier 3.9.9. The source now pins only those three tools to web-config's actual supported peers and the previously selected versions: Playwright 1.62.1, ESLint 10.9.1, and Prettier 3.9.6. The repeated fresh consumer then passed peers and the complete acceptance above. No other dependency declarations changed.

The disposable workspace allowed only the existing bootstrap hook's native build tools, esbuild, sharp, and workerd; the first direct install without that policy failed on ignored native builds, and its log is retained. The temporary lock and workspace were confined to the disposable consumer, which was removed after acceptance. The root registry lock remains byte-for-byte unchanged, no canonical workspace or file override was added, and no registry receipt was fabricated. Product registry-backed setup and CI still require their own acceptance.

Exact package metadata, the temporary frozen lock, source package-manifest digest, and command logs are retained under the ignored `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/root-shipping-001/` directory. No provider configuration, deployment, or routing changed.

## Remaining release gates

The reviewed shared 0.0.1 packages are published and shared registry consumers are verified. Verify each product repository's package access, regenerate its real frozen lock, and pass hosted CI. Provision isolated supporting resources and a sandbox Micropub repository/token; staging must not write to the company website repository. Capture complete live routing and recovery identities, verify the provider candidate and critical journeys, then promote the approved immutable candidate. Retain the prior host through the plan's observation and recovery periods.

## Native dependency build policy

Fresh source acceptance exposed the missing checked-in pnpm11 native build approvals. The repository now declares only `esbuild`, `sharp` and `workerd`, matching its existing bootstrap hook. The focused setup contract failed with the missing policy before implementation and passes with the three-entry allowlist. Canonical registry lock regeneration and fresh authenticated product install remain required; the policy alone does not prove those gates.

A fresh disposable source clone copied this exact policy (SHA-256 `368fd9e50a46d5ca8af48e7eb08751063280a5d933be56ed5eed91e304cda90e`) and installed the approved `0.0.1` shipping tarball. Install, frozen replay, peers, `./run setup`, `./run doctor`, and native Wrangler `4.127.1` passed. Evidence is retained in `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/root-shipping-001-checked-policy/summary.json`. This used a temporary shipping-tarball override; canonical files remained unchanged and authenticated product registry acceptance is still pending.
