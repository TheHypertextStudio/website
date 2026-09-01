#!/usr/bin/env bash
# Regenerate the typographic § favicon set. Uses Sharp (npm) for raster
# rendering; the SVG is hand-rolled.
#
# Outputs:
#   public/favicon.svg
#   public/favicon.ico         (32×32)
#   public/apple-touch-icon.png (180×180)
#   public/mask-icon.svg
#   public/icon-192.png
#   public/icon-512.png
#   public/icon-maskable.png
#
# Sharp requires no system Cairo / ImageMagick.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

dest=public

# 1. Hand-rolled SVG favicon (the § glyph in a serif).
cat > "$dest/favicon.svg" <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FBFBFA" />
  <text x="32" y="46" text-anchor="middle"
        font-family="Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
        font-size="48" font-weight="600" fill="#3157D5">§</text>
</svg>
SVG

cat > "$dest/mask-icon.svg" <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <text x="32" y="46" text-anchor="middle"
        font-family="Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
        font-size="48" font-weight="600" fill="#000">§</text>
</svg>
SVG

# 2. Raster outputs via Sharp. Inline TS so we don't need a separate file.
node --import tsx --eval "
import sharp from 'sharp';
import fs from 'node:fs/promises';

const svg = await fs.readFile('$dest/favicon.svg');

async function out(size, file, opts = {}) {
  await sharp(svg, { density: 400 })
    .resize(size, size, opts)
    .png()
    .toFile(\`$dest/\${file}\`);
  console.log('  →', file, size);
}

const faviconPng = await sharp(svg, { density: 400 }).resize(32, 32).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(32, 6);
icoHeader.writeUInt8(32, 7);
icoHeader.writeUInt8(0, 8);
icoHeader.writeUInt8(0, 9);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(faviconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await fs.writeFile('$dest/favicon.ico', Buffer.concat([icoHeader, faviconPng]));
console.log('  → favicon.ico 32');
await out(180, 'apple-touch-icon.png');
await out(192, 'icon-192.png');
await out(512, 'icon-512.png');
await out(512, 'icon-maskable.png', { fit: 'contain', background: { r: 251, g: 251, b: 250 } });
" 2>&1

echo "  ✓ favicons regenerated"
