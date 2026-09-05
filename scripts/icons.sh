#!/bin/sh
# Renders the PWA icons from the lantern SVG. Needs rsvg-convert (brew install librsvg).
set -e
cd "$(dirname "$0")/.."
SRC=apps/web/public/icon.svg
OUT=apps/web/public/icons
mkdir -p "$OUT"
for size in 192 512; do
  rsvg-convert -w $size -h $size "$SRC" -o "$OUT/icon-$size.png"
done
# Maskable icon: same art, safe zone respected by the SVG's inner padding.
rsvg-convert -w 512 -h 512 "$SRC" -o "$OUT/maskable-512.png"
# iOS home screen icon has no transparency; use the light-theme tile.
rsvg-convert -w 180 -h 180 apps/web/public/icon-ios.svg -o "$OUT/apple-touch-icon.png"
echo "icons written to $OUT"
