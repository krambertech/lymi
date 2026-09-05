// Renders the brand assets from the same geometry the app uses.
// Run: node scripts/brand.mjs   (then sh scripts/icons.sh for the PNGs)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps/web/public/brand");
mkdirSync(out, { recursive: true });

// Tokens, resolved to sRGB hex for files that live outside the app's CSS.
const light = {
  metal: "#2f2823",
  amber: "#f5ad48",
  core: "#fff4c2",
  glass: "rgba(245,173,72,0.16)",
  canvas: "#f8f7f5",
};
const dark = {
  metal: "#f3f0eb",
  amber: "#f6b34d",
  core: "#fff4c2",
  glass: "rgba(246,179,77,0.14)",
  canvas: "#151210",
};

const lanternBody = (c, { flame = true, glow = false } = {}) => `
  ${glow ? `<g filter="url(#glow)">` : ""}
  <path d="M43 22 A17 17 0 0 1 77 22" fill="none" stroke="${c.metal}" stroke-width="6.5" stroke-linecap="round"/>
  <rect x="35.75" y="22" width="48.5" height="59" rx="6" fill="${c.metal}"/>
  <rect x="35" y="19.25" width="50" height="6.5" rx="3.25" fill="${c.metal}"/>
  <rect x="33" y="77.25" width="54" height="6.5" rx="3.25" fill="${c.metal}"/>
  <rect x="42.25" y="25.75" width="35.5" height="51.5" rx="5" fill="${c.canvas}"/>
  <rect x="42.25" y="25.75" width="35.5" height="51.5" rx="5" fill="${c.glass}"/>
  ${
    flame
      ? `<path d="M60 41 C67.5 49.5 70 55 68 61.5 A8 8 0 0 1 52 61.5 C50 55 52.5 49.5 60 41 Z" fill="${c.amber}"/>
  <path d="M60 52 C63.5 56 64.5 58.5 63.5 61.5 A3.5 3.5 0 0 1 56.5 61.5 C55.5 58.5 56.5 56 60 52 Z" fill="${c.core}"/>`
      : ""
  }
  ${glow ? `</g>` : ""}`;

const glowDef = (c, r = 6) => `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${r}" result="b"/>
  <feFlood flood-color="${c.amber}" flood-opacity="0.45"/><feComposite in2="b" operator="in" result="g"/>
  <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

const svg = (w, h, body, viewBox = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${body}\n</svg>\n`;

const glyph = (c) => `
  <path d="M34 20 A16 16 0 0 1 66 20" fill="none" stroke="${c.metal}" stroke-width="10" stroke-linecap="round"/>
  <rect x="29" y="24" width="42" height="50" rx="9" fill="${c.amber}"/>
  <rect x="24" y="16" width="52" height="12" rx="5" fill="${c.metal}"/>
  <rect x="22" y="70" width="56" height="12" rx="5" fill="${c.metal}"/>`;

// Wordmark paths come from the generated TS module.
const ts = readFileSync(join(root, "apps/web/src/client/components/wordmark-paths.ts"), "utf8");
const WM = new Function(
  `${ts
    .replace(/^\/\/.*$/gm, "")
    .replace("export const WORDMARK =", "return")
    .replace("as const;", ";")}`,
)();
const wordmark = (c, { flame = false, x = 0, y = 0, height = 100 } = {}) => {
  const h = WM.bottom - WM.top;
  const k = height / h;
  const glyphs = WM.glyphs
    .map(
      (g) => `<path transform="translate(${g.x} 0) scale(${WM.scale} ${-WM.scale})" d="${g.d}"/>`,
    )
    .join("\n    ");
  const dot = flame
    ? ""
    : `<path transform="translate(${WM.dot.x} 0) scale(${WM.scale} ${-WM.scale})" d="${WM.dot.d}"/>`;
  const fl = flame
    ? `<path d="${WM.flame}" fill="${c.amber}"/><path d="${WM.flameCore}" fill="${c.core}"/>`
    : "";
  return {
    body: `<g transform="translate(${x} ${y - WM.top * k}) scale(${k})"><g fill="${c.metal}">${glyphs}${dot}</g>${fl}</g>`,
    width: WM.width * k,
    height,
  };
};

for (const [name, c] of [
  ["light", light],
  ["dark", dark],
]) {
  writeFileSync(
    join(out, `lantern-${name}.svg`),
    svg(120, 120, `${glowDef(c)}${lanternBody(c, { glow: true })}`),
  );
  writeFileSync(join(out, `lantern-${name}-flat.svg`), svg(120, 120, lanternBody(c)));
  writeFileSync(
    join(out, `lantern-unlit-${name}.svg`),
    svg(120, 120, lanternBody(c, { flame: false })),
  );
  writeFileSync(join(out, `glyph-${name}.svg`), svg(100, 100, glyph(c)));
  const wm = wordmark(c);
  writeFileSync(join(out, `wordmark-${name}.svg`), svg(Math.ceil(wm.width), 100, wm.body));
  const lit = wordmark(c, { flame: true });
  writeFileSync(join(out, `wordmark-lit-${name}.svg`), svg(Math.ceil(lit.width), 100, lit.body));
  // Row lockup, same geometry as LOCKUP in components/Logo.tsx: foot on the baseline, 0.17em gap.
  const L = 138;
  const ls = L / 120;
  const lanternX = -33 * ls;
  const lanternY = -83.75 * ls;
  const textX = (87 - 33) * ls + 17;
  const top = Math.min(WM.top, 5 * ls - 83.75 * ls) - 2;
  const lh = WM.bottom - top;
  const lw = textX + WM.width;
  const scaleTo = 100 / lh;
  writeFileSync(
    join(out, `lockup-${name}.svg`),
    svg(
      Math.ceil(lw * scaleTo),
      100,
      `<g transform="scale(${scaleTo.toFixed(4)}) translate(0 ${(-top).toFixed(2)})">
  <g transform="translate(${lanternX.toFixed(2)} ${lanternY.toFixed(2)}) scale(${ls.toFixed(4)})">${lanternBody(c)}</g>
  ${wordmark(c, { x: textX, y: WM.top * (100 / (WM.bottom - WM.top)) * 0 }).body.replace(/translate\(([\d.]+) ([\d.-]+)\) scale\([\d.]+\)/, `translate(${textX} 0) scale(1)`)}
</g>`,
    ),
  );
}

// App icon: the dark room, always. The lantern fills 78% of the tile; a warm centre sits behind the flame.
// The drawing spans x 33..87 and y 5..85 of its 120 box; centre it on (60, 45) and size it by its visual height.
const tile = (visualHeight, radius) => {
  const k = (1024 * visualHeight) / 78.75;
  const tx = 512 - 60 * k;
  const ty = 512 - 44.4 * k;
  return svg(
    1024,
    1024,
    `${glowDef(dark, 4)}<defs><radialGradient id="warm" cx="50%" cy="50%" r="42%"><stop offset="0" stop-color="${dark.amber}" stop-opacity="0.24"/><stop offset="1" stop-color="${dark.amber}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1024" height="1024" rx="${radius}" fill="${dark.canvas}"/>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#warm)"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">${lanternBody(dark, { glow: true })}</g>`,
  );
};
writeFileSync(join(out, "app-icon.svg"), tile(0.64, 0));
writeFileSync(join(out, "app-icon-maskable.svg"), tile(0.5, 0));
writeFileSync(join(out, "app-icon-rounded.svg"), tile(0.64, 230));

// Favicon: the glyph, ink by day and ivory at night.
writeFileSync(
  join(root, "apps/web/public/icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <style>.m{fill:${light.metal}}.s{stroke:${light.metal}}@media (prefers-color-scheme: dark){.m{fill:${dark.metal}}.s{stroke:${dark.metal}}}</style>
  <path class="s" d="M34 20 A16 16 0 0 1 66 20" fill="none" stroke-width="10" stroke-linecap="round"/>
  <rect x="29" y="24" width="42" height="50" rx="9" fill="${light.amber}"/>
  <rect class="m" x="24" y="16" width="52" height="12" rx="5"/>
  <rect class="m" x="22" y="70" width="56" height="12" rx="5"/>
</svg>
`,
);
writeFileSync(join(root, "apps/web/public/icon-ios.svg"), tile(0.64, 0));
console.log("brand assets written to", out);
