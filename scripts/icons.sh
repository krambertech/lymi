#!/bin/sh
# Renders the PWA icons from the brand SVGs. Needs rsvg-convert (brew install librsvg).
# Regenerate the SVGs first with: node scripts/brand.mjs
set -e
cd "$(dirname "$0")/.."
BRAND=apps/web/public/brand
OUT=apps/web/public/icons
mkdir -p "$OUT"
for size in 192 512; do
  rsvg-convert -w $size -h $size "$BRAND/app-icon.svg" -o "$OUT/icon-$size.png"
done
rsvg-convert -w 512 -h 512 "$BRAND/app-icon-maskable.svg" -o "$OUT/maskable-512.png"
# iOS applies its own corner mask; the tile is square and opaque.
rsvg-convert -w 180 -h 180 apps/web/public/icon-ios.svg -o "$OUT/apple-touch-icon.png"
echo "icons written to $OUT"
