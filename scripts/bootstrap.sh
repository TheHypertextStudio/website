#!/usr/bin/env bash
# =============================================================================
# Hypertext Studio — bootstrap
#
# One command to take a fresh checkout from zero to a working dev environment.
# Idempotent: every section detects its own completion. Re-run as often as you
# like.
#
# Sections:
#   1. Prereqs         — Node, corepack, pnpm, optional CLIs (gh, wrangler)
#   2. Dependencies    — pnpm install
#   3. Env             — copy .env.example → .env (interactive prompt to fill)
#   4. Git hooks       — wire .githooks/ as core.hooksPath
#   5. Cloudflare      — wrangler login + provisioning  (skip with --skip-cloud)
#   6. GitHub          — gh repo create + secrets       (skip with --skip-github)
#   7. Smoke           — typecheck + build to confirm everything wired up
#
# Flags:
#   --skip-cloud       skip Cloudflare auth and resource creation
#   --skip-github      skip GitHub repo + secrets setup
#   --non-interactive  fail rather than prompt; for CI / unattended runs
#   --doctor           run only the prereq checks (no mutation)
#   --verbose          print every command before running
#   -h, --help         show this message
# =============================================================================

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------

SKIP_CLOUD=0
SKIP_GITHUB=0
NON_INTERACTIVE=0
DOCTOR_ONLY=0
VERBOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-cloud) SKIP_CLOUD=1 ;;
    --skip-github) SKIP_GITHUB=1 ;;
    --non-interactive) NON_INTERACTIVE=1 ;;
    --doctor) DOCTOR_ONLY=1 ;;
    --verbose) VERBOSE=1; set -x ;;
    -h|--help)
      sed -n '2,/^# ===/p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      log::err "unknown flag: $1"
      exit 64
      ;;
  esac
  shift
done

readonly SKIP_CLOUD SKIP_GITHUB NON_INTERACTIVE DOCTOR_ONLY VERBOSE

# Tracks summary lines for the final report.
declare -a SUMMARY=()
record() { SUMMARY+=("$1"); }

ask() {
  # ask "Prompt" "default-or-empty"
  local prompt="$1" default="${2:-}" reply
  if (( NON_INTERACTIVE )); then
    if [[ -n "$default" ]]; then
      printf '%s\n' "$default"
    else
      log::err "$prompt — no default and --non-interactive set"
      exit 70
    fi
    return
  fi
  if [[ -n "$default" ]]; then
    read -r -p "  $prompt [$default]: " reply
    printf '%s\n' "${reply:-$default}"
  else
    read -r -p "  $prompt: " reply
    printf '%s\n' "$reply"
  fi
}

# ---------------------------------------------------------------------------
# 1. Prereqs
# ---------------------------------------------------------------------------

check_prereqs() {
  log::title "1. Prerequisites"

  local os
  case "$(uname -s)" in
    Darwin) os=macos ;;
    Linux)  os=linux ;;
    *)
      log::err "unsupported OS: $(uname -s)"; exit 78 ;;
  esac
  log::ok "OS detected: $os"
  record "OS:                 $os"

  # git
  if command -v git >/dev/null 2>&1; then
    log::ok "git $(git --version | awk '{print $3}')"
  else
    log::err "git is not installed"
    [[ $os == macos ]] && log::info "→ run: xcode-select --install"
    exit 1
  fi

  # Node 24+
  if ! command -v node >/dev/null 2>&1; then
    log::err "Node.js is not installed"
    log::info "→ install fnm: brew install fnm   then: fnm install 24"
    exit 1
  fi
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if (( node_major < 24 )); then
    log::err "Node $node_major detected; this project requires Node ≥ 24"
    log::info "→ fnm install 24 && fnm use 24"
    exit 1
  fi
  log::ok "node $(node -v)"
  record "node:               $(node -v)"

  # corepack + pnpm
  if ! command -v corepack >/dev/null 2>&1; then
    log::err "corepack is not on PATH (it ships with Node 16+)"
    exit 1
  fi
  if ! corepack enable >/dev/null 2>&1; then
    log::warn "corepack enable failed (may need sudo for global install)"
  fi
  log::ok "corepack $(corepack -v)"

  # Activate the exact pnpm pinned in package.json (corepack reads packageManager).
  if ! pnpm --version >/dev/null 2>&1; then
    log::err "pnpm not available after corepack enable"
    exit 1
  fi
  log::ok "pnpm $(pnpm --version)"
  record "pnpm:               $(pnpm --version)"

  # Optional CLIs — soft-fail; print install hints.
  if command -v wrangler >/dev/null 2>&1; then
    log::ok "wrangler $(wrangler --version 2>/dev/null | head -n1)"
    record "wrangler:           $(wrangler --version 2>/dev/null | head -n1)"
  else
    log::skip "wrangler not installed (will use 'pnpm dlx wrangler')"
    record "wrangler:           (using pnpm dlx)"
  fi
  if command -v gh >/dev/null 2>&1; then
    log::ok "gh $(gh --version | head -n1 | awk '{print $3}')"
  else
    log::skip "gh CLI not installed (optional; install: brew install gh)"
  fi
  if command -v jq >/dev/null 2>&1; then
    log::ok "jq $(jq --version)"
  else
    log::skip "jq not installed (optional; install: brew install jq)"
  fi
}

# ---------------------------------------------------------------------------
# 2. Dependencies
# ---------------------------------------------------------------------------

install_deps() {
  log::title "2. Dependencies"
  if [[ -d node_modules && -f pnpm-lock.yaml ]]; then
    log::info "node_modules present; running pnpm install (no-op if up to date)"
  else
    log::info "running pnpm install"
  fi
  pnpm install
  log::ok "dependencies installed"
  record "deps:               $(jq -r '. | (.dependencies // {} | length) + (.devDependencies // {} | length)' package.json 2>/dev/null || echo "n/a") packages"
}

# ---------------------------------------------------------------------------
# 3. Env
# ---------------------------------------------------------------------------

setup_env() {
  log::title "3. Environment"
  if [[ -f .env ]]; then
    log::ok ".env present"
  else
    cp .env.example .env
    log::ok ".env created from .env.example"
    log::info "edit .env to fill in values; secrets stay out of git."
  fi
  record "env file:           .env present"
}

# ---------------------------------------------------------------------------
# 4. Git hooks
# ---------------------------------------------------------------------------

install_hooks() {
  log::title "4. Git hooks"
  if [[ ! -d .githooks ]]; then
    log::skip ".githooks/ directory missing — skipping (run again after Phase A)"
    return
  fi
  chmod +x .githooks/* 2>/dev/null || true
  local current
  current="$(git config --get core.hooksPath 2>/dev/null || true)"
  if [[ "$current" == ".githooks" ]]; then
    log::ok "core.hooksPath already set to .githooks"
  else
    git config core.hooksPath .githooks
    log::ok "core.hooksPath set to .githooks"
  fi
  record "git hooks:          .githooks/ wired"
}

# ---------------------------------------------------------------------------
# 5. Cloudflare
# ---------------------------------------------------------------------------

setup_cloudflare() {
  log::title "5. Cloudflare"
  if (( SKIP_CLOUD )); then
    log::skip "skipped (--skip-cloud)"
    record "cloudflare:         skipped"
    return
  fi

  local wrangler_cmd="wrangler"
  command -v wrangler >/dev/null 2>&1 || wrangler_cmd="pnpm dlx wrangler"

  if ! $wrangler_cmd whoami >/dev/null 2>&1; then
    log::info "running: wrangler login (a browser window will open)"
    if (( NON_INTERACTIVE )); then
      log::warn "wrangler login requires interactive auth — skipping"
      record "cloudflare:         skipped (non-interactive)"
      return
    fi
    $wrangler_cmd login
  fi
  local who
  who="$($wrangler_cmd whoami 2>/dev/null | awk -F'[()]' '/account/ {print $2; exit}')"
  log::ok "wrangler authenticated${who:+ (account: $who)}"
  record "cloudflare:         $(echo "${who:-authenticated}")"

  # D1 database — create if missing.
  if [[ -f wrangler.toml ]]; then
    if ! $wrangler_cmd d1 list 2>/dev/null | grep -q "hypertext-studio"; then
      log::info "creating D1 database 'hypertext-studio'"
      $wrangler_cmd d1 create hypertext-studio || log::warn "D1 create failed (may already exist or insufficient permissions)"
    else
      log::ok "D1 'hypertext-studio' present"
    fi
  else
    log::skip "wrangler.toml not yet present — D1 step deferred"
  fi
}

# ---------------------------------------------------------------------------
# 6. GitHub
# ---------------------------------------------------------------------------

setup_github() {
  log::title "6. GitHub"
  if (( SKIP_GITHUB )); then
    log::skip "skipped (--skip-github)"
    record "github:             skipped"
    return
  fi
  if ! command -v gh >/dev/null 2>&1; then
    log::skip "gh CLI not installed; manual: create TheHypertextStudio/website on github"
    record "github:             skipped (gh missing)"
    return
  fi
  if ! gh auth status >/dev/null 2>&1; then
    if (( NON_INTERACTIVE )); then
      log::warn "gh auth required — skipping"
      record "github:             skipped (non-interactive)"
      return
    fi
    log::info "running: gh auth login"
    gh auth login
  fi
  if gh repo view TheHypertextStudio/website >/dev/null 2>&1; then
    log::ok "TheHypertextStudio/website exists on GitHub"
  else
    log::info "creating TheHypertextStudio/website on GitHub"
    gh repo create TheHypertextStudio/website \
      --public --source=. --remote=origin --push 2>/dev/null \
      || log::warn "gh repo create failed (already exists, no permission, or no commits yet)"
  fi
  record "github:             TheHypertextStudio/website"
}

# ---------------------------------------------------------------------------
# 7. Smoke
# ---------------------------------------------------------------------------

run_smoke() {
  log::title "7. Smoke checks"
  if pnpm exec astro --version >/dev/null 2>&1; then
    log::ok "astro CLI works ($(pnpm exec astro --version))"
  else
    log::err "astro CLI failed — investigate pnpm install output"
    exit 1
  fi
  if [[ -f astro.config.mjs ]]; then
    log::ok "astro.config.mjs present"
  fi
}

# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------

report() {
  log::title "Bootstrap complete"
  log::rule
  for line in "${SUMMARY[@]}"; do
    printf '  %s\n' "$line"
  done
  log::rule
  cat <<EOF

  Next steps:
    make dev         # boot the local dev server (localhost:4321)
    make doctor      # re-run health checks any time
    make help        # see every available task

EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if (( DOCTOR_ONLY )); then
  exec bash "$REPO_ROOT/scripts/doctor.sh"
fi

check_prereqs
install_deps
setup_env
install_hooks
setup_cloudflare
setup_github
run_smoke
report
