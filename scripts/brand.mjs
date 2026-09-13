// Renders the brand assets from the same geometry the app uses.
// Run: node scripts/brand.mjs   (then sh scripts/icons.sh for the PNGs)
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps/web/public/brand");
const siteOut = join(root, "apps/site/public/brand");
mkdirSync(out, { recursive: true });

// Tokens, resolved to sRGB hex for files that live outside the app's CSS.
const light = {
  metal: "#2f2823",
  amber: "#f5ad48",
  core: "#fff4c2",
  // Opaque, like --glass in the app: the mark carries its own interior instead of
  // punching a canvas-coloured hole in whatever it is placed on.
  glass: "#f7e4c8",
  glassUnlit: "#f1efec",
  ember: "rgba(42,34,28,0.2)",
  canvas: "#f8f7f5",
};
const dark = {
  metal: "#f3f0eb",
  amber: "#f6b34d",
  core: "#fff4c2",
  glass: "#46351d",
  glassUnlit: "#2a241f",
  ember: "rgba(255,255,255,0.15)",
  canvas: "#151210",
};

// Kept in step with apps/web/src/client/components/lantern-geometry.tsx. The bail is drawn first so
// the hood covers its feet, and every metal part overlaps the glass so nothing can spill.
const lanternBody = (c, { flame = true, glow = false } = {}) => `
  <path d="M40.5 48 A19.5 30 0 0 1 79.5 48" fill="none" stroke="${c.metal}" stroke-width="5.5" stroke-linecap="round"/>
  <rect x="38.5" y="49" width="43" height="46" rx="3" fill="${flame ? c.glass : c.glassUnlit}"/>
  ${glow ? `<g filter="url(#glow)">` : ""}
  ${
    flame
      ? `<path d="M60 58 C66.5 64.5 73.8 73 73.8 84 C73.8 90.9 67.62 96.5 60 96.5 C52.38 96.5 46.2 90.9 46.2 84 C46.2 73 53.5 64.5 60 58 Z" fill="${c.amber}"/>
  <path d="M60 71.25 C63.25 74.5 66.9 78.75 66.9 84.25 C66.9 87.7 63.81 90.5 60 90.5 C56.19 90.5 53.1 87.7 53.1 84.25 C53.1 78.75 56.75 74.5 60 71.25 Z" fill="${c.core}"/>`
      : `<path d="M60 72 C65.6 78.5 67 82 65.4 86 A5.7 5.7 0 0 1 54.6 86 C53 82 54.4 78.5 60 72 Z" fill="${c.ember}"/>`
  }
  ${glow ? `</g>` : ""}
  <rect x="34" y="50" width="5" height="46" rx="2.5" fill="${c.metal}"/>
  <rect x="81" y="50" width="5" height="46" rx="2.5" fill="${c.metal}"/>
  <path d="M50 36 H70 L87 51 H33 Z" fill="${c.metal}" stroke="${c.metal}" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="40.5" cy="48" r="3.2" fill="${c.metal}"/>
  <circle cx="79.5" cy="48" r="3.2" fill="${c.metal}"/>
  <rect x="31" y="92" width="58" height="9" rx="4.5" fill="${c.metal}"/>
  <rect x="38" y="101" width="44" height="5" rx="2.5" fill="${c.metal}"/>`;

const glowDef = (c, r = 6) => `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${r}" result="b"/>
  <feFlood flood-color="${c.amber}" flood-opacity="0.45"/><feComposite in2="b" operator="in" result="g"/>
  <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

const svg = (w, h, body, viewBox = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${body}\n</svg>\n`;

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

// Row lockup, same geometry as LOCKUP in components/Logo.tsx: foot on the baseline, 0.17em gap.
// Bounds of the drawing inside its 120 box: x 31.5 to 88.5, y 15.25 to 106.
const lockup = (c, { glow = false } = {}) => {
  const L = 130;
  const ls = L / 120;
  const lanternX = -31.5 * ls;
  const lanternY = -106 * ls;
  const textX = (88.5 - 31.5) * ls + 17;
  const top = Math.min(WM.top, 15.25 * ls - 106 * ls) - 2;
  const lh = WM.bottom - top;
  const lw = textX + WM.width;
  const scaleTo = 100 / lh;
  return {
    width: Math.ceil(lw * scaleTo),
    body: `<g transform="scale(${scaleTo.toFixed(4)}) translate(0 ${(-top).toFixed(2)})">
  <g transform="translate(${lanternX.toFixed(2)} ${lanternY.toFixed(2)}) scale(${ls.toFixed(4)})">${lanternBody(c, { glow })}</g>
  ${wordmark(c, { x: textX, y: WM.top * (100 / (WM.bottom - WM.top)) * 0 }).body.replace(/translate\(([\d.]+) ([\d.-]+)\) scale\([\d.]+\)/, `translate(${textX} 0) scale(1)`)}
</g>`,
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
  const wm = wordmark(c);
  writeFileSync(join(out, `wordmark-${name}.svg`), svg(Math.ceil(wm.width), 100, wm.body));
  const lit = wordmark(c, { flame: true });
  writeFileSync(join(out, `wordmark-lit-${name}.svg`), svg(Math.ceil(lit.width), 100, lit.body));
  const row = lockup(c);
  writeFileSync(join(out, `lockup-${name}.svg`), svg(row.width, 100, row.body));
}

// App icon: the dark room, always. A warm centre sits behind the flame.
// The drawing spans x 31.5..88.5 and y 15.25..106 of its 120 box; centre it on (60, 60.6) and size
// it by its visual height, so `visualHeight` is the fraction of the tile the lantern stands.
const tile = (visualHeight, radius) => {
  const k = (1024 * visualHeight) / 90.75;
  const tx = 512 - 60 * k;
  const ty = 512 - 60.625 * k;
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

// Favicon: the same drawing, ink by day and ivory at night. The viewBox is squared around the
// drawing's own bounds rather than its 120 box, so the mark fills the tab icon instead of floating
// with a quarter of it empty. The metal and the glass both follow the browser's scheme.
const favicon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="11 12 98 98">
  <style>
    .m{fill:${light.metal};stroke:${light.metal}}.g{fill:${light.glass}}
    @media (prefers-color-scheme: dark){.m{fill:${dark.metal};stroke:${dark.metal}}.g{fill:${dark.glass}}}
  </style>
  <path class="m" d="M40.5 48 A19.5 30 0 0 1 79.5 48" fill="none" stroke-width="5.5" stroke-linecap="round"/>
  <rect class="g" x="38.5" y="49" width="43" height="46" rx="3"/>
  <path d="M60 58 C66.5 64.5 73.8 73 73.8 84 C73.8 90.9 67.62 96.5 60 96.5 C52.38 96.5 46.2 90.9 46.2 84 C46.2 73 53.5 64.5 60 58 Z" fill="${light.amber}"/>
  <path d="M60 71.25 C63.25 74.5 66.9 78.75 66.9 84.25 C66.9 87.7 63.81 90.5 60 90.5 C56.19 90.5 53.1 87.7 53.1 84.25 C53.1 78.75 56.75 74.5 60 71.25 Z" fill="${light.core}"/>
  <rect class="m" x="34" y="50" width="5" height="46" rx="2.5" stroke="none"/>
  <rect class="m" x="81" y="50" width="5" height="46" rx="2.5" stroke="none"/>
  <path class="m" d="M50 36 H70 L87 51 H33 Z" stroke-width="3" stroke-linejoin="round"/>
  <rect class="m" x="37.3" y="44.8" width="6.4" height="6.4" rx="3.2" stroke="none"/>
  <rect class="m" x="76.3" y="44.8" width="6.4" height="6.4" rx="3.2" stroke="none"/>
  <rect class="m" x="31" y="92" width="58" height="9" rx="4.5" stroke="none"/>
  <rect class="m" x="38" y="101" width="44" height="5" rx="2.5" stroke="none"/>
</svg>
`;
writeFileSync(join(root, "apps/web/public/icon.svg"), favicon());
writeFileSync(join(root, "apps/web/public/icon-ios.svg"), tile(0.64, 0));
cpSync(out, siteOut, { recursive: true });
for (const filename of readdirSync(siteOut)) {
  const path = join(siteOut, filename);
  writeFileSync(path, readFileSync(path, "utf8").replace(/[ \t]+$/gm, ""));
}
writeFileSync(join(root, "apps/site/public/icon.svg"), favicon());

// Link preview for the public site, rendered to share.png by icons.sh. Everything sits in the middle
// 630 px, so apps that crop the preview to a square keep the mark and the line. The warm centre is
// the app icon's, the one gradient the system allows.
const share = () => {
  const height = 180;
  const k = height / 100;
  const row = lockup(dark, { glow: true });
  const x = (1200 - row.width * k) / 2;
  return svg(
    1200,
    630,
    `${glowDef(dark, 5)}<defs><radialGradient id="warm" gradientUnits="userSpaceOnUse" cx="540" cy="290" r="560"><stop offset="0" stop-color="${dark.amber}" stop-opacity="0.2"/><stop offset="1" stop-color="${dark.amber}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="${dark.canvas}"/>
  <rect width="1200" height="630" fill="url(#warm)"/>
  <g transform="translate(${x.toFixed(2)} 168) scale(${k})">${row.body}</g>
  <text x="600" y="450" text-anchor="middle" fill="${dark.metal}" font-family="Onest" font-weight="500" font-size="56" letter-spacing="-1.7">Keep what you learn.</text>`,
  );
};
writeFileSync(join(siteOut, "share.svg"), share());
console.log("brand assets written to", out, "and", siteOut);
