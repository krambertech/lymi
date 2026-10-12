// Renders the launch screen's unlit lantern for each room from the lantern data and the palette, so
// the first frame the app draws over it matches. Needs rsvg-convert (brew install librsvg).
// Run: node apps/mobile/scripts/splash-images.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMBER,
  LANTERN_BAIL,
  LANTERN_FRAME,
  LANTERN_GLASS,
} from "../../../packages/design/src/lantern.ts";
import { palette } from "../../../packages/design/src/tokens.gen.ts";

const assets = join(dirname(fileURLToPath(import.meta.url)), "../assets");
// 6.25 px a point at the launch screen's 96 pt.
const PX = 600;

const rect = (s, fill) =>
  `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${fill}"/>`;

/** As the Skia lantern draws it with the flame out: the bail, the unlit glass, the ember, the frame. */
function unlit(p) {
  const frame = LANTERN_FRAME.map((s) =>
    s.d
      ? `<path d="${s.d}" fill="${p.metal}"${s.stroke ? ` stroke="${p.metal}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"` : ""}/>`
      : rect(s, p.metal),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${PX}" height="${PX}">
<path d="${LANTERN_BAIL.d}" fill="none" stroke="${p.metal}" stroke-width="${LANTERN_BAIL.strokeWidth}" stroke-linecap="round"/>
${rect(LANTERN_GLASS, p["glass-unlit"])}
<path d="${EMBER.d}" fill="${p["edge-2"]}"/>
${frame}
</svg>`;
}

for (const room of ["light", "dark"]) {
  const out = join(assets, `splash-${room}.png`);
  execFileSync("rsvg-convert", ["-w", String(PX), "-h", String(PX), "-o", out], {
    input: unlit(palette[room]),
  });
  console.log(`wrote ${out}`);
}
