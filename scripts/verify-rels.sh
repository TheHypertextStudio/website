#!/usr/bin/env bash
# Confirm rel=me reciprocity:
#   - The site links to GitHub, Bluesky, Fediverse with rel="me"
#   - Each remote profile has rel="me" pointing back to hypertext.studio
#
# Outputs a table of pass/fail per identity.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

readonly SITE="https://hypertext.studio/"

check() {
  local label="$1" url="$2" search="$3"
  local body
  body="$(curl -fsSL --max-time 10 -A 'Hypertext Studio relverify' "$url" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then
    log::warn "$label — could not fetch $url"
    return
  fi
  if grep -qE 'rel=("|'\'')[^"'\']*\bme\b[^"'\']*("|'\'')' <<<"$body" \
     && grep -q "$search" <<<"$body"; then
    log::ok "$label — reciprocates $search"
  else
    log::warn "$label — no rel=me back to $search"
  fi
}

log::title "rel=me reciprocity check"

check "site → outbound"   "$SITE" 'rel="me"'
check "GitHub bio"        "https://github.com/TheHypertextStudio" "hypertext.studio"
check "Bluesky profile"   "https://bsky.app/profile/hypertext.studio" "hypertext.studio"
check "Fediverse actor"   "https://fed.brid.gy/r/https://hypertext.studio/" "hypertext.studio"
