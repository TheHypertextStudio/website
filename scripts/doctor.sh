#!/usr/bin/env bash
# Doctor: read-only health check.
#
# Verifies the dev environment is intact: prereq versions, expected files,
# install state. Never mutates. Exits non-zero on any missing requirement.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

problems=0
need() { problems=$(( problems + 1 )); log::err "$1"; }

log::title "Hypertext Studio — doctor"

# Node
if ! command -v node >/dev/null 2>&1; then
  need "Node.js missing"
else
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if (( major < 24 )); then
    need "Node $major detected; need ≥ 24"
  else
    log::ok "node $(node -v)"
  fi
fi

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  need "pnpm missing (run: corepack enable)"
else
  log::ok "pnpm $(pnpm --version)"
fi

# corepack
if ! command -v corepack >/dev/null 2>&1; then
  need "corepack missing (ships with Node)"
else
  log::ok "corepack $(corepack -v)"
fi

# git
if ! command -v git >/dev/null 2>&1; then
  need "git missing"
else
  log::ok "git $(git --version | awk '{print $3}')"
fi

# Project files we expect to exist after Phase A
check_file() {
  if [[ -e "$1" ]]; then log::ok "$1"; else log::warn "$1 missing"; fi
}

log::title "Project files"
check_file package.json
check_file pnpm-lock.yaml
check_file astro.config.mjs
check_file tsconfig.json
check_file .nvmrc
check_file .editorconfig
check_file .prettierrc.json
check_file .gitignore
check_file Makefile
check_file scripts/bootstrap.sh
check_file LICENSE

if [[ ! -d node_modules ]]; then
  need "node_modules/ missing — run: make install"
else
  log::ok "node_modules/"
fi

# Optional CLIs
log::title "Optional CLIs"
for cmd in wrangler gh jq mkcert; do
  if command -v "$cmd" >/dev/null 2>&1; then
    case "$cmd" in
      gh) v="$(gh --version | head -n1 | awk '{print $3}')" ;;
      *) v="$($cmd --version 2>/dev/null | head -n1)" ;;
    esac
    log::ok "$cmd $v"
  else
    log::skip "$cmd (optional)"
  fi
done

log::rule
if (( problems > 0 )); then
  log::err "$problems issue(s) found. See messages above."
  exit 1
fi
log::ok "all checks passed"
