#!/usr/bin/env bash
# Boot the full dev stack:
#   • the Astro site
#   • all five Cloudflare Workers (www, poem, webmention, micropub, oembed)
#
# Each service runs under Portless so it gets a stable .localhost subdomain.
# Resulting URLs (visible in the Portless TUI):
#
#   https://hypertext.localhost            site (astro dev)
#   https://www.localhost                  canonical redirect worker
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

readonly RUNTIME_PID_DIR="$REPO_ROOT/.hypertext/dev-pids"
rm -rf "$RUNTIME_PID_DIR"
mkdir -p "$RUNTIME_PID_DIR"

log::step "applying local D1 migrations"
CI=1 bash "$REPO_ROOT/scripts/migrate-d1.sh" local hypertext-studio \
  --env-file /dev/null \
  --persist-to ".wrangler/state/webmention"

# Spawn each service in the background; capture roots so cleanup can terminate
# the complete Portless → package manager → runtime process tree.
pids=()

terminate_tree() {
  local parent="$1"
  local child
  while read -r child; do
    [[ -n "$child" ]] && terminate_tree "$child"
  done < <(pgrep -P "$parent" 2>/dev/null || true)
  kill -TERM "$parent" 2>/dev/null || true
}

cleanup() {
  trap - EXIT INT TERM
  log::info "stopping dev stack"
  local pid
  for pid in "${pids[@]:-}"; do
    [[ -n "$pid" ]] && kill -TERM "$pid" 2>/dev/null || true
  done
  local pid_file
  for pid_file in "$RUNTIME_PID_DIR"/*.pid; do
    [[ -f "$pid_file" ]] && terminate_tree "$(<"$pid_file")"
  done
  wait 2>/dev/null || true
  rm -rf "$RUNTIME_PID_DIR"
}

trap cleanup EXIT INT TERM

start() {
  local name="$1"
  local inspector_port="$2"
  local pid_file="$RUNTIME_PID_DIR/$name.pid"
  local env_file="/dev/null"
  if [[ -f ".dev.vars.$name" ]]; then
    env_file=".dev.vars.$name"
  fi
  log::step "starting $name → https://$name.localhost"
  (
    # Portless chooses an available upstream PORT. Wrangler does not consume
    # that environment variable itself, so the child shell forwards it as an
    # explicit CLI flag after Portless has populated it.
    pnpm exec portless "$name" bash -c \
      'printf "%s\n" "$$" > "$5"; exec pnpm exec wrangler dev --env "$1" --env-file "$2" --port "$PORT" --inspector-port "$3" --persist-to "$4"' \
      _ "$name" "$env_file" "$inspector_port" ".wrangler/state/$name" "$pid_file"
  ) &
  pids+=("$!")
}

start www 9230
start poem 9231
start webmention 9232
start micropub 9233
start oembed 9234

# Start the Astro site under the same lifecycle trap. Portless picks the
# project name from package.json (`hypertext` per portless.json).
log::step "starting site → https://hypertext.localhost"
(
  ASTRO_DEV_BACKGROUND=0 pnpm exec portless run --force bash -c \
    'printf "%s\n" "$$" > "$1"; exec pnpm exec astro dev --ignore-lock --port "$PORT" --host "$HOST"' \
    _ "$RUNTIME_PID_DIR/site.pid"
) &
pids+=("$!")

# Keep the supervisor alive until the stack exits or receives a signal. The
# EXIT trap then stops every child so local Workers cannot be orphaned.
wait "${pids[@]}"
