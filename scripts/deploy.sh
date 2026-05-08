#!/usr/bin/env bash
# Deployment dispatcher.
#
#   scripts/deploy.sh preview   # Cloudflare Pages preview
#   scripts/deploy.sh prod      # Cloudflare Pages prod + workers
#   scripts/deploy.sh workers   # workers only

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

target="${1:-preview}"
WRANGLER="pnpm exec wrangler"

deploy_pages() {
  local branch="$1"
  log::step "deploying to Cloudflare Pages (branch: $branch)"
  $WRANGLER pages deploy dist --project-name=hypertext-studio --branch="$branch"
}

deploy_workers() {
  for w in poem webmention micropub oembed; do
    log::step "deploying worker: $w"
    $WRANGLER deploy --env "$w"
  done
}

case "$target" in
  preview)
    bash scripts/build.sh
    deploy_pages "$(git symbolic-ref --short HEAD 2>/dev/null || echo 'preview')"
    ;;
  prod|production)
    bash scripts/build.sh
    deploy_pages main
    deploy_workers
    ;;
  workers)
    deploy_workers
    ;;
  *)
    log::err "unknown target: $target (expected: preview | prod | workers)"
    exit 64
    ;;
esac

log::ok "deploy complete"
