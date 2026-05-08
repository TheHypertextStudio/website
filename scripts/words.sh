#!/usr/bin/env bash
# Sum the word count across every built HTML page in dist/. Writes the result
# back to .env.local as PUBLIC_WORD_COUNT so the footer status panel can
# display it on the next build.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -d dist ]]; then
  echo "dist/ not found; run 'make build' first" >&2
  exit 1
fi

# Strip tags + whitespace, count words.
total=0
while IFS= read -r -d '' f; do
  text="$(sed -e 's/<[^>]*>/ /g' "$f" | tr -s '[:space:]' ' ')"
  words="$(echo "$text" | wc -w | tr -d ' ')"
  total=$(( total + words ))
done < <(find dist -name '*.html' -print0)

out=".env.local"
{
  grep -v '^PUBLIC_WORD_COUNT=' "$out" 2>/dev/null || true
  echo "PUBLIC_WORD_COUNT=$total"
} > "$out.tmp"
mv "$out.tmp" "$out"

echo "  total words: $total"
