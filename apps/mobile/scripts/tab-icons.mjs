#!/usr/bin/env node

// Renders the Lucide icons the native tab bar shows into template PNGs at 1x, 2x and 3x, because the system
// tab bar takes images, not React components. Needs rsvg-convert (brew install librsvg).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const icons = { today: "sun", library: "book-marked", you: "circle-user-round" };
const out = resolve(root, "assets/tabs");
mkdirSync(out, { recursive: true });

for (const [name, lucide] of Object.entries(icons)) {
  const svg = readFileSync(resolve(root, `node_modules/lucide-static/icons/${lucide}.svg`), "utf8")
    .replace(/stroke-width="[\d.]+"/, 'stroke-width="1.75"')
    .replace(/stroke="currentColor"/, 'stroke="#000"');
  const tmp = resolve(tmpdir(), `lymi-tab-${name}.svg`);
  writeFileSync(tmp, svg);
  // 25 pt, the tab bar's icon size, at each screen scale Metro picks from.
  for (const [suffix, px] of [
    ["", 25],
    ["@2x", 50],
    ["@3x", 75],
  ])
    execFileSync("rsvg-convert", [
      "-w",
      `${px}`,
      "-h",
      `${px}`,
      tmp,
      "-o",
      resolve(out, `${name}${suffix}.png`),
    ]);
}
console.log(`Wrote ${Object.keys(icons).length} tab icons.`);
