// Draws the tab bar's Lucide icons as template PNGs, which iOS's own tab bar needs instead of SVG.
// Run with `pnpm tab-icons` after changing a tab's icon; it needs `rsvg-convert` (brew install librsvg).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TABS = {
  today: "sun",
  library: "book-bookmark",
  explore: "compass",
  you: "circle-user-round",
};
/** Points, as the tab bar draws them; the 2x and 3x files follow. */
const SIZE = 22;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../assets/tabs");
// The package exports only its entry, so find its folder from the CommonJS build it points to.
const entry = createRequire(import.meta.url).resolve("lucide-react-native");
const lucide = entry.slice(0, entry.lastIndexOf("/dist/"));
const scratch = mkdtempSync(join(tmpdir(), "tab-icons-"));
mkdirSync(out, { recursive: true });

for (const [tab, icon] of Object.entries(TABS)) {
  const source = readFileSync(join(lucide, "dist/cjs/icons", `${icon}.js`), "utf8");
  // The build declares the icon as a plain object literal; read it as one.
  const literal = source.split("const __iconData = ")[1].split("\n};")[0];
  const { node } = new Function(`return ${literal}}`)();
  const body = node
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${props}/>`;
    })
    .join("");
  const svg = join(scratch, `${tab}.svg`);
  writeFileSync(
    svg,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  );
  for (const scale of [1, 2, 3]) {
    const file = join(out, `${tab}${scale === 1 ? "" : `@${scale}x`}.png`);
    const px = String(SIZE * scale);
    execFileSync("rsvg-convert", ["-w", px, "-h", px, svg, "-o", file]);
  }
  console.log(`${tab}: ${icon}`);
}
