#!/usr/bin/env bash
# Clean up routes whose child processes have already died before a dev run.
# No-ops if Portless isn't installed.

set -euo pipefail

if ! command -v portless >/dev/null 2>&1 && ! pnpm exec portless --version >/dev/null 2>&1; then
  exit 0
fi

# Portless is shared by every local project, so never stop its proxy here.
pnpm exec portless prune >/dev/null 2>&1 || true
