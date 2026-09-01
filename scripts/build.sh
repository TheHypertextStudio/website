#!/usr/bin/env bash
# Production build pipeline. This script is the single build owner used by
# package scripts, Make, CI, previews, and break-glass deployments.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

log::step "generating optional public identity"
node scripts/public-metadata.mjs

if [[ ! -f public/favicon.svg ]]; then
  log::step "generating favicons"
  bash scripts/icons.sh
fi

log::step "generating default OG image"
bash scripts/og.sh

log::step "astro build"
pnpm exec astro build

log::ok "build complete"
