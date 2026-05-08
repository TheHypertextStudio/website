#!/usr/bin/env bash
# Audit harness. Subcommands:
#   lighthouse  Lighthouse CI against dist/ (target 100/100/100/100)
#   axe         axe-playwright zero-violations gate (uses tests/a11y/)
#   html        W3C html-validator on every built page
#   schema      schema.org validator on JSON-LD blocks
#
# These are intentionally thin wrappers — the real configs live in test/
# and lighthouserc.json, both added in Phase H.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

mode="${1:-all}"

ensure_built() {
  if [[ ! -d dist ]]; then
    log::step "build first"
    pnpm run build >/dev/null
  fi
}

run_lighthouse() {
  ensure_built
  log::step "Lighthouse CI"
  pnpm dlx @lhci/cli@latest autorun --config=lighthouserc.json
}

run_axe() {
  ensure_built
  log::step "axe-playwright (a11y)"
  pnpm exec playwright test tests/a11y --reporter=list
}

run_html() {
  ensure_built
  log::step "W3C html-validator"
  pnpm dlx html-validator-cli@latest --files=dist/**/*.html
}

run_schema() {
  ensure_built
  log::step "Schema.org validation"
  log::info "manual: open https://validator.schema.org/?url=https://hypertext.studio/"
  log::info "(no batch CLI exists; CI fetches /index.html and posts to validator)"
}

case "$mode" in
  lighthouse|lh) run_lighthouse ;;
  axe|a11y)      run_axe ;;
  html)          run_html ;;
  schema)        run_schema ;;
  all)
    run_lighthouse
    run_axe
    run_html
    run_schema
    ;;
  *) log::err "unknown mode: $mode"; exit 64 ;;
esac
