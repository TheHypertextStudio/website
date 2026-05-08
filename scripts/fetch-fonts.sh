#!/usr/bin/env bash
# Fetch self-hosted variable fonts. Idempotent — skips files already present.
#
# Sources:
#   Source Serif 4 — Adobe (SIL OFL)
#   Inter          — Rasmus Andersson, rsms.me (SIL OFL)
#   IBM Plex Mono  — IBM (SIL OFL)
#
# Run via: make fonts (or scripts/fetch-fonts.sh directly).

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DEST="$REPO_ROOT/public/fonts"
mkdir -p "$DEST"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

fetch() {
  local name="$1" url="$2" out="$3"
  if [[ -f "$DEST/$out" ]]; then
    log::ok "$name (cached)"
    return
  fi
  log::info "fetching $name"
  if ! curl -fsSL --retry 3 --max-time 60 -o "$DEST/$out.tmp" "$url"; then
    log::warn "fetch failed for $name; will fall back to system fonts at runtime"
    rm -f "$DEST/$out.tmp"
    return
  fi
  mv "$DEST/$out.tmp" "$DEST/$out"
  log::ok "$name → public/fonts/$out"
}

log::title "Fetching variable fonts"

# Inter v4 — variable WOFF2 (regular + italic axes)
fetch "Inter Variable" \
  "https://github.com/rsms/inter/raw/v4.1/docs/font-files/InterVariable.woff2" \
  "InterVariable.woff2"

# Source Serif 4 Variable — Roman + Italic
fetch "Source Serif 4 Variable (Roman)" \
  "https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Roman.otf.woff2" \
  "SourceSerif4Variable-Roman.woff2"

fetch "Source Serif 4 Variable (Italic)" \
  "https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Italic.otf.woff2" \
  "SourceSerif4Variable-Italic.woff2"

# IBM Plex Mono — regular weight (non-variable; variable not yet released)
fetch "IBM Plex Mono Regular" \
  "https://cdn.jsdelivr.net/gh/IBM/plex@master/packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2" \
  "IBMPlexMono-Regular.woff2"

log::ok "fonts ready ($(ls "$DEST" 2>/dev/null | wc -l | tr -d ' ') files)"
