# Website standardization source checkpoint

## Source cleanup on 2026-10-11

The user requested removal of ad hoc or unconventional migration workflows/scripts. Cleanup is reviewed and committed in all six repositories. Studio, LogDate, web-platform and release-engineering are integrated by normal rebase merges; their default-branch CI passed. Curfew's website/docs CI passed and native capture CI remains running. Docket integration remains pending the existing Google production backend baseline. Published package versions and production hosting are unchanged.

| Repository          | Cleanup commit                     | Static evidence                                                                                                                                                                            |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Studio              | `00cb8cf`, documentation `f8a5090` | ESLint, Astro/TypeScript, formatting, workflow lint and native Wrangler dry run passed; Astro built 11 pages into `dist/`                                                                  |
| Curfew              | `da487ee`                          | Astro checks/build, affected ESLint/formatting and website workflow lint passed; 14 public files moved without byte changes; release workflow retains two pre-existing ShellCheck findings |
| LogDate             | `28db410`                          | Affected ESLint/formatting, workflow lint, native Wrangler types and Worker TypeScript passed                                                                                              |
| Docket              | `397e6284`                         | Root/web TypeScript, affected lint/formatting, workflow lint, shell syntax and existing CI gate policy passed                                                                              |
| Web platform        | `933b621`, documentation `7ccbb7d` | ESLint, workspace and acceptance-source TypeScript, formatting and workflow lint passed                                                                                                    |
| Release engineering | `b8ca109`                          | Python compilation, undefined-name/syntax lint and workflow lint passed; native provider functions and legacy site adapters preserved                                                      |

Existing required commit hooks ran normally. No manual tests, dependency installations, lockfile changes, provider mutations or production publication occurred in this cleanup. Studio and Curfew builds were local; the Next apps still require their ordinary hosted validation and actual staging acceptance.

Subsequent hosted checks passed for Studio PR60/main `831d36d` (CI38172264808 and38172898951, CodeQL38172264805 and38172898905; 821 browser cases plus one existing skip), LogDate PR6/main `7cf747e` (Quality38172239434 and38172788249; 204 browser cases), web-platform PR6/main `e2dea20` (CI38172267111 and38172638232), and release-engineering PR9/main `37fe36f` (CI38172208964,38172277545 and38172621046). Curfew website/docs38172208197 passed at `da487ee4`; native38172208207 remains pending. These are the repositories' existing suites, not new migration probes. LogDate's retained Vercel alias still serves `dpl_Dve3XKcjzFVmCghUHW7pvGBnxYZL`; Studio Pages remains at `c7365ead-0505-46f5-85c0-0eb87db22725`.

Custom lifecycle/candidate/promotion, archive assembly, release identity endpoints, recovery/cache adapters and one-off investigation jobs are removed. Shared private packages, Mintlify generation/content, application guards and existing backend/native release behavior remain. Published packages and tooling tags are unchanged.

Studio and web-platform cross review found two stale documentation references; both were corrected. Current operations are in [deployment](deployment.md); source integration and provider work remain in the [revised plan](superpowers/plans/2026-10-10-company-website-standardization.md).

## Native staging follow-through

Studio's scoped staging token remains saved in the GitHub `staging` environment, restricted to main deployments. No credential value was read. Fresh provider inspection found its existing `staging.hypertext.studio` custom domain and disabled workers.dev/preview URLs, but no Access application protected the hostname. The account's existing Google Workspace identity provider is `b2bfca5e-37a4-4f76-8583-a4a0007b19ff` for `hypertext.studio`.

Created reusable Access policy `2fddfb97-c128-4226-b4e6-8e7e97a0d07e`, allowing authenticated Studio email addresses, and attached it to self-hosted staging application `79db268c-2596-45e7-a69f-8c8a445d799c`. The application permits only that existing Workspace provider with a 24-hour session and HttpOnly cookie. A fresh anonymous request now receives HTTP302 to the Studio Access login instead of website HTML. Production hosts and DNS/routes were not changed. Authenticated staff access and rendered staging acceptance remain unproved.

The prepared ordinary `Deploy staging` workflow consumes the successful main CI run's existing site artifact and native Wrangler configuration. It has no production path, custom manifest, packaging script or recovery runner. Full hosted deployment using the saved single-Worker token remains the next acceptance gate.

## Earlier migration evidence

> Historical migration evidence. On 2026-10-11 the custom lifecycle, candidate/promotion, packaging and staging recovery machinery was retired at the user's request. Commands below describe earlier runs and are not current operating instructions. See [deployment](deployment.md) and [development](development.md) for the supported commands.

This records source and hosted registry acceptance for the Studio frontend migration. Production remains on Pages; this checkpoint does not authorize a hosting cutover.

## Tooling and artifact

The lifecycle now pins published release-engineering v0.1.8, revision `878260def7229cd3df7f752b32e5581230c5db2d`, archive SHA-256 `61f746429fc0ffc7826df2bde61ee4d41323fb5fa0c9f8661255040e7838afd4`. The native pin updater verified the actual published archive and tag; `./run doctor` passed all declared tool/version checks, and `./run build` produced the eleven-page native Workers artifact using the existing local dependency graph. The original artifact acceptance below used v0.1.7, Node 24.20.0, pnpm 11.9.0 and Wrangler 4.127.1 in an isolated source consumer. Full hosted registry-backed checkout acceptance is recorded below; the actual 0.0.1 tarball acceptance also uses v0.1.8.

The original shared frontend config acceptance used its reviewed local 0.1.0 tarball. The initial 0.0.1 packages are now published, and shared registry verification passed for all four exact package integrities. The actual 0.0.1 shipping acceptance below supersedes the historical tarball input. The registry-lock acceptance below records actual repository access and lock regeneration. Subsequent full hosted CI accepts that adopted lock, as recorded below.

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

Context7 documentation retrieval remains blocked by its monthly quota; the compatibility evidence uses exact published registry metadata and package source. At this historical checkpoint, product registry access, canonical registry lock regeneration and fresh hosted acceptance were pending; the full hosted acceptance below supersedes those gates. No fabricated registry entry or local tarball override is committed.

## Actual 0.0.1 shipping acceptance

The root website consumed the actual `@thehypertextstudio/web-config@0.0.1` tarball from shared candidate `38116243716-1`, source `a108b4fec7d1fca02fb59afb09237cf9b52a1ca6`, manifest SHA-256 `097bb8cd7f4bb7341bb9bfdc48c79cc0c855a95c3b25a225374c1f9da3f58fa4`. Its tarball SHA-256 is `5950447cc3a49a1fe26f28fb1ef9c3a3e76f6e64ae9bfea47099132db4d870f6`; every installed package file also matches the tarball bytes. [Publication completed](https://github.com/TheHypertextStudio/web-platform/actions/runs/38116605945), and [fresh shared registry consumers passed](https://github.com/TheHypertextStudio/web-platform/actions/runs/38116980056) with all four published integrities matching the reviewed shipping bytes. This local product run used the verified tarball rather than private registry credentials.

A disposable source checkout outside this checkout's ancestors started with no `node_modules`. A genuine temporary file-tarball override and newly resolved lock passed native install, frozen replay, peers, shared `./run setup`, `doctor`, `check`, and `build` under Node 24.20.0 and pnpm 11.9.0. Wrangler remains exactly 4.127.1. Formatting, broad lint, Astro/TypeScript checks, all 149 unit tests, and nine supporting workerd tests passed; Astro reported 43 files without diagnostics. Nine inventory-capture Node tests passed separately. The eleven-page candidate passed all ten existing artifact browser scenarios through Workers Static Assets.

The initial existing-graph check reproduced the obsolete optional accessibility peer receipt. An independent fresh graph removed that receipt but exposed three broad source ranges selecting unsupported newer tools: Playwright 1.64.0, ESLint 10.12.0, and Prettier 3.9.9. The source now pins only those three tools to web-config's actual supported peers and the previously selected versions: Playwright 1.62.1, ESLint 10.9.1, and Prettier 3.9.6. The repeated fresh consumer then passed peers and the complete acceptance above. No other dependency declarations changed.

The disposable workspace allowed only the existing bootstrap hook's native build tools, esbuild, sharp, and workerd; the first direct install without that policy failed on ignored native builds, and its log is retained. The temporary lock and workspace were confined to the disposable consumer, which was removed after acceptance. The root registry lock remains byte-for-byte unchanged, no canonical workspace or file override was added, and no registry receipt was fabricated. Product registry-backed setup and CI still require their own acceptance.

Exact package metadata, the temporary frozen lock, source package-manifest digest, and command logs are retained under the ignored `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/root-shipping-001/` directory. No provider configuration, deployment, or routing changed.

## Remaining release gates

The reviewed private 0.0.1 packages and shared registry consumers are verified. Studio, Curfew and Docket have repository-native package access and genuine registry locks. Studio `6020274d` passed full CI `38128439944`. Curfew `3ef4f092` passed website/docs CI `38128156061` and native CI `38128156073`, including the completed marketing captures. Docket `a86274f7` passed all twelve validation/acceptance jobs in `38134002339`; provider publishing was skipped. LogDate's user-authorized private transfer/default-main change and two required package Actions Read grants are complete. Its adapter-backed lint candidate has exact-shipping consumer acceptance; native workflow authentication, canonical registry graph and current product/runtime acceptance remain open.

Studio's isolated frontend Worker/domain exists with only the Hello World bootstrap. Complete the staging credential handoff and supported default-branch candidate trigger, then verify actual provider bytes, journeys and recovery before promotion. Curfew's actual Pages Git settings still publish raw source; coordinate its filtered output and existing previews before integration, preserving native release/feed ownership. Connect accepted Curfew Mintlify source and reconcile Docket's docs canonical/deployment delivery separately. Docket's reviewed shipping entrypoint and runtime gateway are implemented and its clean native shipping build passed; signed candidate, existing staging backend authentication alignment and provider acceptance remain open. Supporting Webmention/Micropub sandboxes must not write to the production repository. All four frontend cutovers, production acceptance, observation and old-host retention remain open.

## Native dependency build policy

Fresh source acceptance exposed the missing checked-in pnpm11 native build approvals. The repository now declares only `esbuild`, `sharp` and `workerd`, matching its existing bootstrap hook. The focused setup contract failed with the missing policy before implementation and passes with the three-entry allowlist. Canonical registry lock regeneration and fresh authenticated product install remain required; the policy alone does not prove those gates.

A fresh disposable source clone copied this exact policy (SHA-256 `368fd9e50a46d5ca8af48e7eb08751063280a5d933be56ed5eed91e304cda90e`) and installed the approved `0.0.1` shipping tarball. Install, frozen replay, peers, `./run setup`, `./run doctor`, and native Wrangler `4.127.1` passed. Evidence is retained in `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/root-shipping-001-checked-policy/summary.json`. This used a temporary shipping-tarball override; canonical files remained unchanged and authenticated product registry acceptance is still pending.

## Native repository registry lock

The manual dependency-lock job in [run38118654678](https://github.com/TheHypertextStudio/website/actions/runs/38118654678) used only this repository's short-lived `GITHUB_TOKEN` with package-read permission. Fresh resolution, a script-disabled frozen install of the actual registry package, and `pnpm peers check` passed. The enclosing workflow's ordinary jobs still failed against the previous source lock; only the dependency-lock job is accepted here.

The adopted lockfile SHA-256 is `ed08c874c4d9a0b745b8c3a6b434e02862e4b1f63c4b06fdcb0f2b1eb5cbe5b7`. Artifact `11694438343` has digest `sha256:d8f04e94d808afa98af0164129aa14adf92a3594d699a8dd1b1eb76a9f68df66`. Independent review verified all direct manifest specifiers and exact pins, every retained package integrity, the approved web-config shipping integrity, and the absence of local overrides and obsolete legacy accessibility peer receipts.

Fresh resolution also updated dependencies within existing manifest ranges, including Astro `7.2.9` to `7.3.8`, markdown-remark `7.2.4` to `7.3.2`, TypeScript parser `8.68.0` to `8.71.1`, Node types `26.4.0` to `26.6.5`, and sharp `0.35.4` to `0.35.5`. Exact Node, pnpm, Wrangler, Playwright, ESLint, Prettier and shared package declarations remain unchanged. Earlier local build results do not accept this newer graph: ordinary full frozen-install CI on the adopted lock is still required.

Evidence and independent source review are retained under `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/registry-lock-38118654678/`. No classic token was created. All twelve private package Read grants for the three Studio-owned consumer repositories were verified, while source Admin access, inheritance, and private visibility were preserved. LogDate's personal-account repository still requires a supported secret-free access design; no transfer is authorized by this checkpoint.

The first ordinary CI run on the adopted graph, `38119074350`, failed setup because pnpm's default 24-hour release-age check rejected the just-published internal `web-config@0.0.1`. Its log names no other violating package. The workspace now records an exact package-and-version exception for that already approved immutable release; every other package and future version retains the default age policy. [pnpm documents version-specific exclusions](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexclude). The subsequent full ordinary CI below accepts this policy change.

## Full hosted registry acceptance

[CI38119479270](https://github.com/TheHypertextStudio/website/actions/runs/38119479270) passed every enabled job on reviewed head `ecf398f287b1ecf3cd20d6944465ff5760745e77`: quality, unit/Worker checks, build, browsers, artifact validation and the final report. Ordinary installation used the repository's native short-lived package-read token and the adopted frozen lock. The browser job passed 821 scenarios with one recorded skip and zero flake budget; the retained Worker artifact passed all ten scenarios. The skipped case is not accepted as covered.

GitHub checked out pull-request merge SHA `bfa44aa9142f07f59b5dd6824d2fc5dbeb92592b`; its Git tree and the reviewed head both equal `003d37c5a74a258c6082141e01387afd5b4bdfb3`. Artifact `11694772012` has digest `sha256:d2231bc6ac202e5f0920f14f0bfb7da32adc856fdf56c579024e56ac7d35689a`. These identities describe the CI artifact, not an approved production promotion candidate. Production and provider inventory jobs were skipped; no frontend hosting changed.

Logs, run/artifact metadata and the acceptance summary are retained in `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/studio-native-registry-ci-38119479270/`.

## Production source reconciliation

Read-only provider metadata confirmed Studio Pages production `181825c` is included in this branch. Curfew Pages production had advanced to `3efbd4f`; its migration was rebased onto that source before registry lock adoption. Docket's canonical alias resolves to READY deployment `dpl_BMZ9vBNqkEutvxGwLcLB73Fknakf`, source `ee15b735`; the migration now includes that production source and subsequent main documentation commit `096a6d8`. The newer canceled deployment is not its canonical source.

LogDate's private Vercel project deploys `main`, while GitHub defaults to stale `develop`. Its original migration omitted thirty shipped commits. The replacement port starts at actual deployed main `488add9`, preserving public utility pages, artwork, native associations, passkey changes and waitlist source. Historical acceptance on the stale branch does not accept this replacement. Registry/peer, runtime, ownership and main/develop release-policy gates remain open.

## October 11 provider and dependency checkpoint

Studio's complete hosted CI `38120706952` passed at `01d6cf43`, with 821 browser scenarios passed, one skipped and ten retained-artifact scenarios passed. All six validation jobs passed; provider inventory, dependency-lock refresh and production were skipped. The synthetic checkout `316d6aec` and source have identical tree `c0c99731b7f40895574ba4abb70224718161b11d`. CI artifact `11695321786` has SHA-256 `5827fb9c85476c3912ea4705a4eda8182c93cf17f638b5eaf601f409fbce614f`; it is not an approved production candidate.

Actual GitHub configuration now has a main-only `staging` environment and a main-only `production` environment requiring `WillieCubed` review. Self-review is allowed; administrator bypass has not been established as disabled. No credentials or activation variables were created. Read-only `cf` inspection found neither the frontend site Worker nor staging DNS record. Existing bearer-token scope and environment selection, provider resources, staging journeys, recovery, promotion and observation remain open. Frontend-only staging has no D1 or Micropub binding; supporting-service sandboxes are separate acceptance work.

Docket's canonical native registry lock SHA-256 is `89959e78b9a7732169e298341f6bff7cf7106de5fc5f27b8acba94a1837a7598`. Registry job `38120984041` retained artifact `11695925526`, ZIP SHA-256 `322796463351c6ce4796c9b02b8f386cb79f22c32bc2d91421d5236ec76255a2`. Product React and Tiptap versions were preserved, while Babel/PostCSS edges and optional peer availability changed. Independent review cleared adoption; the failed product CI remains evidence of incomplete source/runtime acceptance.

## October 11 credential scope and refreshed source gates

[Studio CI38124406377](https://github.com/TheHypertextStudio/website/actions/runs/38124406377) passed all six validation jobs at `1a1816eb0c598bc5e9f3ac427b1bce90efc3dc8f`, with 821 browser passes/one skip and ten artifact passes. Site artifact `11695969823` has digest `sha256:78cfb6a80887f00bccd7608e4f6f592af75a259f02e79f795333a512f7ff444e`. Production was skipped. This is CI acceptance for the named source, before the later staging configuration change; it is not a promotion candidate.

Read-only account verification in `38124766256` identified active hosted token `ea9099ed066a9871768238f08b284156`. Chrome's Hypertext Studio dashboard showed that same token's account-wide settings/D1/platform and all-zone route-write grants. The API details request returned 403; expiry/effective conditions remain unverified. The positive scope evidence rules out treating it as a staging-only credential. No credential value, permission change or new token was needed for this audit.

Staging configuration omits routing declarations and disables workers.dev and version preview URLs. Interactive bootstrap subsequently created `hypertext-studio-site-staging` (`543af5e594a0411997f74becebfd4b0a`) and the isolated `staging.hypertext.studio` custom domain. Both URL flags are verified false in provider metadata. A bounded public request returned the 12-byte Hello World template; an earlier default-user-agent request returned 403, so this is a point observation, not broad availability acceptance. This bootstrap has no data bindings and is not the website candidate. The prior absent state, provider connection metadata and dashboard screenshot are retained for recovery. No production connection changed.

The proposed routine deployment credential is Editor on this existing staging Worker only. Current official documentation and pinned Wrangler source support the route-preserving upload model. Credential selection, native candidate upload and recovery acceptance remain open, and no native GitHub OIDC exchange was established. The frontend runtime still declares only ASSETS and release identity variables. Account-audit CI `38124766256` also completed successfully at `1a1816eb`, before this staging configuration change.

Docket's reviewed retained-lock refresh `38124448126` passed resolution, script-disabled frozen installation, strict peers and source immutability. Adopted lock SHA-256 is `61493c19fdeec85f7205ba7a9c46afa53f6eefd7ded8f93386e241f0525ac510`; artifact `11696378417` ZIP SHA-256 is `e79109e4879286ecada07a6147bd84309d0fe0f04cc3aa20effd1f815e941f47`. All package receipts/catalogs are unchanged. Peer contexts and four existing transitive edges changed and were reviewed. Commit `2dbea15c` also preserves all assertions while repairing the calendar mock and Core docs environment. CI `38124725953` passed core browser and web checks; the later docs coverage setup failure keeps complete CI acceptance open.

Fresh read-only reconciliation found Curfew production deployment `a4d2490c-3620-491f-b868-e44131a36597`, source `2c56e0680605533a953f90cc6f3268e3ecec6d43`, deployed October 11 at 07:25:57 UTC. That source is 55 commits beyond the earlier baseline. Its homepage matches current main; the new Pages docs proxy and configured `curfew.mintlify.dev/docs` return the same 404 body. Current-source porting and upstream reconciliation are required before accepting earlier migration parity. No production configuration changed during this inspection.

Ignored receipts retain the Studio run/artifact logs, correlated token metadata, bounded provider metrics and Curfew source/body correlation under `.superpowers/sdd/2026-10-10-company-website-standardization/acceptance/`. Hostname analytics are adaptive aggregates, not a Pages-only outage or cause measurement. Provider latency and billing baselines remain incomplete. No company frontend production cutover occurred.

## October 11 current-source acceptance regroup

[Studio CI 38126071305](https://github.com/TheHypertextStudio/website/actions/runs/38126071305) passed all six validation jobs for `01b32719`, including 821 browser scenarios with one recorded skip and ten artifact scenarios. CodeQL passed separately. Synthetic checkout `aa32c543fcffcac8e85cfe07328fb2aa1717a356` and reviewed branch source share tree `ef685832e016e718755531734844020b88972deb`. Artifact `11696932359` has digest `sha256:8e7a424c15fde2a8a4eb33ebf4d0f184980cc12814c742fa2d524fa1547293f9`. Production was skipped; this is retained source/artifact CI evidence, not a provider candidate.

[Docket CI 38126412295](https://github.com/TheHypertextStudio/athena-web/actions/runs/38126412295) passed at `5bc5e81cdade1698d96e98751d3c289ee45de386`: all 12 validation jobs, 7,059 API tests, 4,975 web tests, 27 core journeys and existing performance checks. Both existing docs tests ran on a fresh task cache with nonempty coverage of the actual private registry implementation. All 373 tooling tests and complexity checks passed; no assertion or threshold changed. The Mintlify CLI wrapper remains unexercised by those two tests. Image publication and release readiness were skipped. All three jobs in [downstream deployment 38127495900](https://github.com/TheHypertextStudio/athena-web/actions/runs/38127495900) were skipped. No shipping artifact or provider operation was produced. Final receipt SHA-256 is `16f0fa8dc1919d8fbf0a60da591799b2f0683afb00d77e3f5f96055d50a342ef` under the Docket checkout's `.scratch/registry-lock-acceptance/run-38126412295/`.

Curfew source `d3116622f4a00a0b321dfcf9283db17d33303ae3` includes all 55 newer upstream commits and passed [website/docs CI 38126937595](https://github.com/TheHypertextStudio/curfew/actions/runs/38126937595), including 18 Worker browser cases, current page/asset contracts and native Mintlify validation. Its existing native source/build job passed; screenshot capture remains live. Follow-up `3ef4f092ddafb7cb828bdcf6436e7ec1dfc69911` adds canonical raw `404.html` using existing wording/styles. No native/backend/release path or dependency lock changed. Its automatic [website/docs CI 38128156061](https://github.com/TheHypertextStudio/curfew/actions/runs/38128156061) passed, including all 18 retained browser cases; native capture remains pending.

Fresh provider metadata shows Curfew Pages still publishes raw `landing` with empty build command and output `.`; current preview `51aef450-4f64-4137-ae6d-3d2661f64c96` returned 200 for three known development source paths. The prepared filtered output alone does not fix that live configuration or remove older immutable previews. Reconcile publication quiescence, the Node-only filter, skipped private dependency installation, active native release publisher and scoped preview cleanup before integration. Current appcast URLs return HTML and fail XML parsing; no valid signed-feed recovery baseline is established. Preserve native generation/signing ownership without inventing a release, and reconcile eventual Worker publication before cutover. Mintlify source selection is an unsaved `main` / `web/docs` draft and is not a deployment.

Docket's historical local Worker artifact contains localhost API rewrites. Its lifecycle has no admitted deploy/candidate configuration yet, and runtime environment isolation requires review of actual API, public-config, host classification, cross-origin MCP and service-worker consumers. Current Node journeys do not prove Workers runtime behavior. LogDate's current source still has three ESLint 10 peer incompatibilities; maintained rule mapping is under review. No classic GitHub token, transfer, new package release or frontend production cutover occurred.

## October 11 LogDate ownership and current application acceptance

The user authorized moving the existing private LogDate repository to `TheHypertextStudio/logdate-web` and accepted the Vercel Hobby restriction on fresh private-organization Git builds while moving off Vercel. Post-transfer GitHub metadata verifies unchanged repository ID `429209675`, unchanged main `488add9675bb5dfec4c39ae016d10515393305c1` and develop `098f641828fc59b00481da230079ba18a0365ece`, with `main` now default. The approved package Actions Read grants for private `web-config` and `web-tokens` are applied and verified. Native install-only workflow authentication and genuine canonical registry lock adoption remain pending; no classic token or GitHub App key was created.

Read-only post-transfer Vercel metadata reports retained production deployment `dpl_Dve3XKcjzFVmCghUHW7pvGBnxYZL` READY at the unchanged deployed main SHA. The public apex still serves Vercel. Neither observation exercises recovery or starts the required retention clock. No Vercel settings, domains, deployments or frontend production routes changed.

Docket exact head `a86274f7bfb6fe5bb57d89ee9244742457a11a48` passed [CI 38134002339](https://github.com/TheHypertextStudio/athena-web/actions/runs/38134002339): all twelve validation/acceptance jobs passed, while image/release jobs were skipped by existing event guards. The clean shipping entrypoint completed actual Turbo/Next/OpenNext assembly with no caller public/runtime/secret/APP_MODE inputs. Worker SHA-256 is `47172f532c904ab1aee47129ede42fa666707f39f5f7bc0159781977549b58f3`; all 366 asset files match and all 63 cache files match BUILD_ID `IiQpkVTfV2rypyTjEvpnI`. This does not constitute a signed candidate or provider runtime/recovery acceptance. Existing staging API configuration still names Vercel's passkey RP; reconcile it with a reviewed owned Workers frontend origin before authenticated preview acceptance.

Current Curfew native [CI 38128156073](https://github.com/TheHypertextStudio/curfew/actions/runs/38128156073) passed at `3ef4f092`, including Release builds, 26 UI interactions, ten fixtures and 18 marketing captures. Artifact `11698533469` contains 227 files with digest `sha256:bfd5bf41479152c56ad1cb0a5cf6a495d8c8f574f5d253a6b6259ed80ef800ea`. Actual Pages settings, Mintlify delivery, Workers runtime and cutover remain separate gates.

## First default-branch candidate

The protected rebase integration of PR53 produced main `3bf1ffe418efca47401801a0a57a13fc7de6a633`, with the exact tree reviewed at `026b67caf5afa9e7831fe433d55fca3cb8841b5a`. The latter passed full CI38159580413 and CodeQL38159580405. Production promotion remains disabled and Pages continues serving.

The human-created staging token is active, scoped only to `hypertext-studio-site-staging`, and expires November 10, 2026. Its nonsecret saved policy and GitHub staging-secret metadata were inspected; no credential value was read. Actual hosted provider use remains required.

Default-branch candidate38160755452 stopped before assembly or provider operations: the product bootstrap launcher requested the private bootstrap repository's release, which the repository-native token cannot read. Published release-engineering v0.1.8 already documents its existing public v0.1.0 bootstrap mirror. The launcher now selects that mirror with all four original platform SHA-256 pins, cache checks and native preparation unchanged. No new release, credential, visibility change or dependency-policy exception is introduced. The fix passed CI38161205969 and CodeQL38161206123, then integrated by protected rebase as main `38ffae9b94e08311e403a363de074106b209fd9c`. Its automatic candidate38162019859 prepared dependencies, passed source checks and built the archive, but Cloudflare rejected the version upload with code100324: `_redirects` line9 contains a Pages-only absolute source. Candidate activation is paused while packaging is corrected; no successful candidate or provider journey is claimed.

## Current provider and registry follow-through

The Workers asset preparer removes only the existing Pages domain-level `www` rule from its copied output, preserving `public/_redirects` for the retained Pages site. Unknown nonrelative sources stop packaging. The independently deployed `www` Worker already owns canonical path/query redirects. [Workers Static Assets accepts path sources and does not support domain-level redirect rules](https://developers.cloudflare.com/workers/static-assets/redirects/). Provider acceptance of the corrected archive remains required.

LogDate canonical registry lock adoption and native-token installation are complete. Genuine lock proposal38161039481 passed resolution, frozen installation and strict peers; source `c385eccc5b6fd0139bfd6a2edbd0b315a822484e` passed ordinary full [Quality38161647852](https://github.com/TheHypertextStudio/logdate-web/actions/runs/38161647852). The temporary proposal lane is removed. Backend/RP authority, waitlist inputs, paired deployment wiring and isolated provider/runtime acceptance remain separate.

Docket metadata-only [WIF audit38161422541](https://github.com/TheHypertextStudio/athena-web/actions/runs/38161422541) succeeded for the existing staging service and serving revision `docket-api-staging-00008-4qv`. Only allowed configuration and secret reference names were read. Its proposed Cloudflare frontend still lacks the Worker/domain and exact GitHub staging environment; R2 reports dashboard enablement required, and Images entitlement is unverified. Current [Cloudflare size policy](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/) allows 64 MiB uncompressed on all plans; Docket's retained upload fits that size limit. Provider startup/CPU acceptance is still open.

Curfew Pages Git automatic builds are paused with production deployment `a4d2490c-3620-491f-b868-e44131a36597` unchanged. No build/output/environment setting or native release workflow changed. Exact-source native CI, source integration, filtered preview delivery and signed-feed ownership remain required.

The complete 50-file Studio site artifact consumed by successful production publisher37744632194 is retained without rebuilding: artifact11535501028, SHA-256 `6d835284cec1a676780e98a8f70ec52e656a60503190e0120bfe2492cdefa031`, source `181825c88f78af3d823bff8205879aa2f0ca25a0`. This closes artifact retention only; real restoration, current route/data preservation and production cutover remain unexercised.

## October 11 staging provider acceptance

Studio PR56 passed protected CI38162403708 and CodeQL, then rebase merged as main `b28211bc4e5cc804adfea08cb63a0ecb8e0c22ca`, with the reviewed source tree unchanged. The unique automatic [candidate38163234657](https://github.com/TheHypertextStudio/website/actions/runs/38163234657) succeeded. Candidate manifest SHA-256 is `3769c0a3a33542764569249579378b1779d3ba39af97ebb18beaa9bb9f1596b8`; shipping archive SHA-256 is `017c5a843a8b7c8f5f6c972f21035c86b8cee483c37ff338e15c6613af7c936d`. Actual staging version `3075a528-6b2f-4e05-8b01-6be5ddb10a2a` serves 100% of traffic. The live no-store release response matches source, artifact and candidate.

All 48 public files are accounted for: 37 non-HTML files match exact retained bytes; eleven HTML pages match after removing only Cloudflare's injected Insights script. Delivered HTML is therefore not byte-identical. Security/cache headers, encoded-query trailing-slash redirect, sitemap redirect and real branded 404 were observed. Chrome's Hypertext Studio profile rendered the desktop site, completed contact steps one through three without submitting an enquiry, and navigated from Services to Products at 390 by 844 pixels with no horizontal overflow and the target below the sticky header. Staging recovery remains unexercised; the analytics beacon conflicts with the existing script policy and is not treated as a product failure or permission to weaken that policy.

The user completed R2 enablement. `docket-web-staging-cache` and `logdate-web-staging-cache` now exist with r2.dev disabled and no custom domains. LogDate and Docket have main-only GitHub staging environments. Their staging Worker placeholders return 503/no-store, have no data bindings or domains, and disable workers.dev/version previews. These are bootstrap resources, not app runtime acceptance. Routine cache authorization still needs provider verification; legacy bucket object credentials and modern individual-bucket Editor policy must not be conflated. No account-wide permission expansion is approved.

LogDate full [Quality38162517992](https://github.com/TheHypertextStudio/logdate-web/actions/runs/38162517992) passed at `f93a1073987a503097e355cfa5d9612bf0e3d11e`. Existing local Google access verified the serving staging backend and RP `cloud-staging.logdate.app`; an auth frontend under that hostname preserves the existing RP. Backend origin, waitlist and revalidation isolation remain open. Curfew exact-source native CI38161233239 and website/docs CI38161233241 passed; PR47 rebase integrated main `a5b5a699bcce3d136a0d312789384f8180cb08c0`. Its filtered Pages preview `12a124c7` succeeded: nine pages and six assets match canonical bytes, and checked development paths plus absent appcast return 404. Retained production is unchanged.

### Staging recovery operation

`Recover Studio staging website` runs only on owner main in the existing staging environment. Its executor pins published lifecycle v0.1.10 at revision `a13ccabcda7a2c3b7321fe412d2397f25df04d29`, archive SHA-256 `704ba2748c540e36293677a50244184a93c5da6febecdad41650609b8bc6eb2f`, and uses the existing Worker-scoped credential. Candidate producers remain pinned to immutable v0.1.8; their exact provenance requirement is unchanged. Capture takes an exact successful default-branch candidate ID and manifest digest; it verifies GitHub's artifact digest and the candidate's full shipping digests before invoking the shared staging capture command. Restore additionally requires the successful capture run ID, retained record file digest, expected live version and expected routing digest. The shared command enforces the saved account/Worker/environment, retained archive, routing and version identities before restoring. Candidate upload and recovery share a non-cancelling concurrency group.

PR57 passed protected CI38164892049 and integrated with the reviewed tree as main `86a406e535a8607f4f9e2c71f4101b03690f883a`; main CI38165729259 also passed. The first [capture38165763297](https://github.com/TheHypertextStudio/website/actions/runs/38165763297) failed before writes because v0.1.8's deployment reader did not unwrap Cloudflare's deployment result when pagination metadata was present. A fresh native Cloudflare read still showed version `3075a528-6b2f-4e05-8b01-6be5ddb10a2a` at 100%. Shared v0.1.9 changes only that deployment reader and recovery notes. Source CI38166711109, PR CI38166719528, main CI38166830177 and [release38167027824](https://github.com/TheHypertextStudio/release-engineering/actions/runs/38167027824) succeeded; both public release assets and all archived Studio source bytes match the tag. New S3 transport work remains a separate draft and is absent from this release. Successful capture and restoration remain unproven.

Pause the candidate activation variable before integrating or performing a recovery exercise, reconcile in-flight publishers, capture serving candidate A, stage reviewed candidate B, then restore A and compare its live release/asset/routing identities. A-to-A reconciliation is not a restoration exercise. Retain both artifacts, the record, journal and before/after provider observations. The workflow has no production mode; production recovery and promotion remain separate.

## October 11 recovery authorization and Mintlify connection checkpoint

PR58 passed protected CI38167485981 and CodeQL, then rebase integrated as main
`bdf0a81c0692450968e5c6a8f6a699b5fff3952a` with the reviewed source tree unchanged.
The single [v0.1.9 capture38168366416](https://github.com/TheHypertextStudio/website/actions/runs/38168366416)
verified the published executor checksum, then failed with HTTP403 before retaining
any recovery artifact. The denied API endpoint is unknown from its generic error.
This does not establish a missing permission or authorize wider access. Candidate
activation remains paused; no candidate B or restore was attempted. The original
staging candidate was confirmed at 100% immediately before capture.

The user approved replacing Curfew's Mintlify-hosted content with its reviewed Git
source. Saved provider settings now confirm `TheHypertextStudio/curfew`, `main`,
`web/docs`. The first manual update succeeded and reports four pages, but its details
expose no source SHA or deployment ID. Three public HTML pages, sampled JS/CSS and
`/docs/llms.txt` deliver correctly with the approved accessible orange. `/docs/mcp`
returns405 on both the public proxy and upstream. Mintlify
[reserves `/mcp` for its search server](https://www.mintlify.com/docs/ai/model-context-protocol);
source and proxy correction is being prepared to preserve the existing guide URL.
Full proxy, search and recovery acceptance remain open. The earlier Pages repair
review must be refreshed because its default HTML-guide mode would replace the
now-working Mintlify pages. No Pages production rebuild occurred.

Docket's public docs still canonicalize to the old Studio alias. Its correct existing
address, `clearthedocket.com/docs`, is drafted in the provider form, but Save remains
disabled despite a valid editable field; the reason is not exposed. No setting save
or DNS change occurred. Its compatibility branch must not be pushed wholesale to
main without resolving existing automatic image/backend/Vercel publication. The
current source gate remains separate from Mintlify publication acceptance.

### Recovery diagnostic executor

Published [v0.1.10](https://github.com/TheHypertextStudio/release-engineering/releases/tag/v0.1.10)
adds fixed, nonsecret API operation labels to recovery HTTP errors. Its release
workflow38169296538 passed; independently downloaded public assets, checksums and
all22 archived Studio sources match the reviewed tag. It contains no S3 transport.
This checkpoint changes only the recovery executor URL/checksum and its explanatory
comment; retained candidate provenance remains immutable v0.1.8. A fresh main-only
capture must identify the denied operation before any permission correction is
proposed. No diagnostic capture or successful recovery is claimed by this source
update.
