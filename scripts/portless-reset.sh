#!/usr/bin/env bash
# Clean up Portless daemon state before a dev run.
# No-ops if Portless isn't installed.

set -euo pipefail

if ! command -v portless >/dev/null 2>&1 && ! pnpm exec portless --version >/dev/null 2>&1; then
  exit 0
fi

# Stop any running daemon, ignore errors.
pnpm exec portless stop >/dev/null 2>&1 || true

# Clear stale lock files in the project's portless cache.
rm -rf .portless-cache 2>/dev/null || true
rm -f .portless.pid 2>/dev/null || true
