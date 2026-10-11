#!/usr/bin/env bash
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT="$ROOT/build/site-candidate"
cd "$ROOT"

pnpm run build
rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/assets"
cp -R dist/. "$OUTPUT/assets/"
node scripts/prepare-workers-assets.mjs "$OUTPUT/assets"
cp wrangler.site.json "$OUTPUT/wrangler.site.json"
pnpm exec tsc \
  --ignoreConfig \
  --target ES2022 \
  --module ES2022 \
  --moduleResolution Bundler \
  --lib ES2022 \
  --types @cloudflare/workers-types \
  --strict \
  --skipLibCheck \
  --outDir "$OUTPUT" \
  workers/site/index.ts
mv "$OUTPUT/index.js" "$OUTPUT/worker.js"
