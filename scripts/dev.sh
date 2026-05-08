#!/usr/bin/env bash
# Boot the full dev stack:
#   • the Astro site
#   • all four Cloudflare Workers (poem, webmention, micropub, oembed)
#
# Each service runs under Portless so it gets a stable .localhost subdomain.
# Resulting URLs (visible in the Portless TUI):
#
#   https://hypertext.localhost            site (astro dev)
#   https://poem.localhost                 GET /api/poem
#   https://webmention.localhost           POST /webmention, GET /webmentions
#   https://micropub.localhost             POST /micropub
#   https://oembed.localhost               GET /oembed
#
# The first run will register the local CA via `portless trust`. After that
# every subsequent run is silent.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

bash "$REPO_ROOT/scripts/portless-reset.sh"

# Spawn each worker in the background; capture PIDs so we can clean up.
pids=()
trap 'log::info "stopping dev stack"; kill ${pids[@]:-} 2>/dev/null || true' EXIT INT TERM

start() {
  local name="$1" dir="$2"
  log::step "starting $name → https://$name.localhost"
  ( cd "$dir" && pnpm exec portless "$name" pnpm exec wrangler dev ) &
  pids+=("$!")
}

start poem        "$REPO_ROOT/workers/poem"
start webmention  "$REPO_ROOT/workers/webmention"
start micropub    "$REPO_ROOT/workers/micropub"
start oembed      "$REPO_ROOT/workers/oembed"

# Foreground: the Astro site. Portless picks the project name from package.json
# (`hypertext` per portless.json).
log::step "starting site → https://hypertext.localhost"
exec pnpm exec portless run pnpm run dev:astro
