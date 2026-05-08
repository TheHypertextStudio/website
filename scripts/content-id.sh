#!/usr/bin/env bash
# Stamp the build identity into .env.local so the footer status panel and
# colophon show real values. Idempotent: overwrites the relevant keys only.
#
# Honors $GITHUB_SHA when running in CI; otherwise reads `git rev-parse`.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

hash="${GITHUB_SHA:-$(git rev-parse --short=8 HEAD 2>/dev/null || echo "")}"
if [[ -z "$hash" ]]; then
  hash="wip"  # repo has no commits yet
elif ! git diff --quiet HEAD -- 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  hash="${hash:0:8}-dirty"
else
  hash="${hash:0:8}"
fi
time="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Page count: source pages + collection entries (best-effort, not exact).
pages="$(find src/pages -type f \( -name '*.astro' -o -name '*.md' -o -name '*.mdx' -o -name '*.ts' \) 2>/dev/null | wc -l | tr -d ' ')"

mkdir -p ./.hypertext
out=".env.local"
{
  grep -v '^PUBLIC_BUILD_HASH=\|^PUBLIC_BUILD_TIME=\|^PUBLIC_DEPLOY_REGION=\|^PUBLIC_PAGE_COUNT=' "$out" 2>/dev/null || true
  echo "PUBLIC_BUILD_HASH=$hash"
  echo "PUBLIC_BUILD_TIME=$time"
  echo "PUBLIC_DEPLOY_REGION=${DEPLOY_REGION:-CFP}"
  echo "PUBLIC_PAGE_COUNT=$pages"
} > "$out.tmp"
mv "$out.tmp" "$out"

echo "  build hash:  $hash"
echo "  build time:  $time"
echo "  pages:       $pages"
