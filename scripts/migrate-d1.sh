#!/usr/bin/env bash
# Upgrade the Webmention database safely, then apply repository migrations.
#
# Usage:
#   scripts/migrate-d1.sh remote <database> [wrangler flags...]
#   scripts/migrate-d1.sh local <database> [wrangler flags...]

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

readonly MODE="${1:-}"
readonly DATABASE_NAME="${2:-}"
shift 2 || true

case "$MODE" in
  remote) environment=production; location=(--remote) ;;
  local) environment=staging; location=(--local) ;;
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
  [[ $'\n'"$schema_columns"$'\n' == *$'\n'"$1"$'\n'* ]]
}

schema_json="$(
  pnpm --silent exec wrangler d1 execute "$DATABASE_NAME" \
    --config workers/webmention/wrangler.toml --env "$environment" "${location[@]}" \
    --command "PRAGMA table_info(webmentions)" --json --yes "$@"
)"

# Parse once outside an if condition so malformed output fails before any write.
# pnpm's normal status messages must not be mixed into Wrangler's JSON stream.
schema_columns="$(
  printf '%s' "$schema_json" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const payload = JSON.parse(input);
      if (
        !Array.isArray(payload) ||
        !payload.length ||
        payload.some(
          (result) =>
            !result ||
            typeof result !== "object" ||
            result.success !== true ||
            !Array.isArray(result.results),
        )
      ) {
        throw new Error("Invalid D1 schema response");
      }
      const rows = payload.flatMap((result) => result.results);
      if (rows.some((row) => !row || typeof row.name !== "string")) {
        throw new Error("Invalid D1 schema columns");
      }
      process.stdout.write(rows.map((row) => row.name).join("\n"));
    });
  '
)"

# Some pre-migration installations have the table but predate mention types.
# Upgrade that known legacy shape before migrations create the related index.
if has_column id && ! has_column mention_type; then
  pnpm exec wrangler d1 execute "$DATABASE_NAME" \
    --config workers/webmention/wrangler.toml --env "$environment" "${location[@]}" \
    --command "ALTER TABLE webmentions ADD COLUMN mention_type TEXT NOT NULL DEFAULT 'mention'" \
    --yes "$@"
fi

pnpm exec wrangler d1 migrations apply "$DATABASE_NAME" \
  --config workers/webmention/wrangler.toml --env "$environment" "${location[@]}" "$@"
