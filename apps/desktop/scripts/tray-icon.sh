#!/bin/sh
# Renders the menu bar icon; macOS tints a "Template" image to match the menu bar.
set -e
cd "$(dirname "$0")/.."
rsvg-convert -w 18 -h 18 assets/tray.svg -o assets/trayTemplate.png
rsvg-convert -w 36 -h 36 assets/tray.svg -o assets/trayTemplate@2x.png
