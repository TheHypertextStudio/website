#!/usr/bin/env bash
# Direct Pages deploys and local rebuild-based production recovery are retired.
# Production resumes after the shared immutable-candidate workflow is connected.

set -euo pipefail

case "${1:-}" in
  preview|break-glass)
    printf '%s\n' 'Deployment is unavailable until the shared Workers candidate workflow is connected.' >&2
    printf '%s\n' 'Do not deploy a local build or change production routes from this checkout.' >&2
    exit 69
    ;;
  *)
    printf '%s\n' 'usage: scripts/deploy.sh preview|break-glass' >&2
    exit 64
    ;;
esac
