#!/usr/bin/env bash
# Production build pipeline: stamp build identity, build site, count words,
# (re)generate OG image and icons if missing.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

log::step "stamping build identity"
bash scripts/content-id.sh

if [[ ! -f public/favicon.svg ]]; then
  log::step "generating favicons"
  bash scripts/icons.sh
fi

if [[ ! -f public/og.png ]]; then
  log::step "generating default OG image"
  bash scripts/og.sh
fi

log::step "astro build"
pnpm run build

log::step "counting words"
bash scripts/words.sh

log::ok "build complete"
