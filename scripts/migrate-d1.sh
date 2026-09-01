#!/usr/bin/env bash
# Upgrade the Webmention database safely, then apply repository migrations.
#
# Usage:
#   scripts/migrate-d1.sh remote <database> [wrangler flags...]
#   scripts/migrate-d1.sh local <database> [wrangler flags...]

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

readonly ENVIRONMENT="webmention"
readonly MODE="${1:-}"
readonly DATABASE_NAME="${2:-}"
shift 2 || true

case "$MODE" in
  remote) location=(--remote) ;;
  local) location=(--local) ;;
  *)
    printf 'usage: %s remote|local <database> [wrangler flags...]\n' "${BASH_SOURCE[0]}" >&2
    exit 64
    ;;
esac

if [[ -z "$DATABASE_NAME" ]]; then
  printf 'database name is required\n' >&2
  exit 64
fi

has_column() {
  local schema_json="$1"
  local wanted="$2"
  printf '%s' "$schema_json" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const payload = JSON.parse(input || "[]");
      const rows = payload.flatMap((result) => result.results || []);
      process.exit(rows.some((row) => row.name === process.argv[1]) ? 0 : 1);
    });
  ' "$wanted"
}

schema_json="$(
  pnpm exec wrangler d1 execute "$DATABASE_NAME" \
    --env "$ENVIRONMENT" "${location[@]}" \
    --command "PRAGMA table_info(webmentions)" --json --yes "$@"
)"

# Some pre-migration installations have the table but predate mention types.
# Upgrade that known legacy shape before migrations create the related index.
if has_column "$schema_json" id && ! has_column "$schema_json" mention_type; then
  pnpm exec wrangler d1 execute "$DATABASE_NAME" \
    --env "$ENVIRONMENT" "${location[@]}" \
    --command "ALTER TABLE webmentions ADD COLUMN mention_type TEXT NOT NULL DEFAULT 'mention'" \
    --yes "$@"
fi

pnpm exec wrangler d1 migrations apply "$DATABASE_NAME" \
  --env "$ENVIRONMENT" "${location[@]}" "$@"
