#!/usr/bin/env bash
# Deployment dispatcher.
#
#   scripts/deploy.sh preview       # explicit Cloudflare Pages preview
#   scripts/deploy.sh break-glass   # manual production recovery path

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
  for w in www poem webmention micropub oembed; do
    log::step "deploying worker: $w"
    $WRANGLER deploy --env "$w"
  done
}

apply_migrations() {
  log::step "applying remote D1 migrations"
  bash scripts/migrate-d1.sh remote hypertext-studio
}

case "$target" in
  preview)
    pnpm run build
    deploy_pages "$(git symbolic-ref --short HEAD 2>/dev/null || echo 'preview')"
    ;;
  break-glass)
    log::warn "manual production recovery path; normal releases are owned by GitHub Actions"
    pnpm run build
    apply_migrations
    deploy_workers
    deploy_pages main
    BASE_URL="https://hypertext.studio" bash scripts/smoke.sh
    ;;
  *)
    log::err "unknown target: $target (expected: preview | break-glass)"
    exit 64
    ;;
esac

log::ok "deploy complete"
