#!/bin/sh
# Renders the app icon from assets/icon.svg: a PNG for the Dock in development and an .icns for packaging.
set -e
cd "$(dirname "$0")/.."
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/icon.png
set_dir=$(mktemp -d)/Lymi.iconset
mkdir -p "$set_dir"
for size in 16 32 128 256 512; do
  rsvg-convert -w $size -h $size assets/icon.svg -o "$set_dir/icon_${size}x${size}.png"
  rsvg-convert -w $((size * 2)) -h $((size * 2)) assets/icon.svg -o "$set_dir/icon_${size}x${size}@2x.png"
done
iconutil -c icns "$set_dir" -o assets/icon.icns
