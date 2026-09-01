#!/usr/bin/env bash
# Render the default Open Graph image (1200×630) with the studio's
# typography. Saved to public/og.png. Per-page OG images can be generated
# from this template later by injecting page-specific text.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

dest=public

# .hypertext/ is gitignored; it may not exist on a fresh clone or CI runner.
mkdir -p .hypertext

cat > .hypertext/og.svg <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#FBFBFA" />
  <text x="80" y="180"
        font-family="Inter, system-ui, sans-serif"
        font-size="120" font-weight="700" letter-spacing="-3"
        fill="#25231F">Hypertext</text>
  <text x="80" y="320"
        font-family="Inter, system-ui, sans-serif"
        font-size="120" font-weight="700" letter-spacing="-3"
        fill="#25231F">Studio</text>
  <text x="80" y="540"
        font-family="Source Serif 4, serif"
        font-style="italic" font-size="36"
        fill="#6E6A63">builds software for humans</text>
  <text x="80" y="595"
        font-family="IBM Plex Mono, monospace"
        font-size="22" fill="#6E6A63" letter-spacing="0.5">hypertext.studio</text>
</svg>
SVG

mkdir -p "$dest"
node --import tsx --eval "
import sharp from 'sharp';
await sharp('.hypertext/og.svg', { density: 200 })
  .resize(1200, 630)
  .png()
  .toFile('$dest/og.png');
console.log('  → og.png 1200×630');
"

echo "  ✓ OG image regenerated"
