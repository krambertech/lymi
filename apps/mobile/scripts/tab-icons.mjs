// Draws the tab bar's Lucide icons as template PNGs, which iOS's own tab bar needs instead of SVG, each
// with a filled twin for the chosen tab, since Lucide draws outlines only. Run with `pnpm tab-icons` after changing a tab's icon; it needs `rsvg-convert` (brew install librsvg).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const draw = ([tag, attrs], extra = "") => `<${tag} ${props(attrs)} ${extra}/>`;
// A knockout cuts the icon's inner shapes out of its filled body, as SF Symbols' `.fill` variants do.
const knockout = (cut) =>
  `<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/>${cut}</mask>`;

/** Each tab's Lucide icon, and its filled twin drawn from the same nodes. */
const TABS = {
  today: {
    icon: "sun",
    filled: ([disc, ...rays]) => draw(disc, 'fill="#000"') + rays.map((r) => draw(r)).join(""),
  },
  library: {
    icon: "book-bookmark",
    // The cover fills down to the pages, the ribbon hangs from its top edge, and the pages stay open.
    filled: ([ribbon, book]) =>
      knockout(`${draw(ribbon, 'fill="#000" stroke="#000"')}<path d="M9 2h8" stroke="#fff"/>`) +
      `<g mask="url(#cut)"><path d="M4 17V4.5A2.5 2.5 0 016.5 2H19a1 1 0 011 1v14z" fill="#000"/>${draw(book)}</g>`,
  },
  explore: {
    icon: "compass",
    // Lucide's needle is too short and wide to read once cut out, so the disc takes a slimmer two-tone
    // needle: its north half cut through, its south half an open outline.
    filled: ([rim]) =>
      knockout(
        '<path d="M16.5 7.5 13.6 13.6 10.4 10.4z" fill="#000" stroke="#000" stroke-width="1.5"/>' +
          '<path d="M7.5 16.5 10.4 10.4 13.6 13.6z" stroke="#000" stroke-width="1.5"/>',
      ) + draw(rim, 'fill="#000" mask="url(#cut)"'),
  },
  you: {
    icon: "circle-user-round",
    // The rim stays an outline and the person fills, set apart from each other as SF Symbols' person is.
    filled: ([, , rim]) =>
      `<clipPath id="rim"><circle cx="12" cy="12" r="10"/></clipPath>` +
      '<circle cx="12" cy="10.5" r="4" fill="#000" stroke="none"/>' +
      '<circle cx="12" cy="21.5" r="6" fill="#000" stroke="none" clip-path="url(#rim)"/>' +
      draw(rim),
  },
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

function props(attrs) {
  return Object.entries(attrs)
    .filter(([key]) => key !== "key")
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
}

function render(name, body) {
  const svg = join(scratch, `${name}.svg`);
  writeFileSync(
    svg,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  );
  for (const scale of [1, 2, 3]) {
    const file = join(out, `${name}${scale === 1 ? "" : `@${scale}x`}.png`);
    const px = String(SIZE * scale);
    execFileSync("rsvg-convert", ["-w", px, "-h", px, svg, "-o", file]);
  }
}

for (const [tab, { icon, filled }] of Object.entries(TABS)) {
  const source = readFileSync(join(lucide, "dist/cjs/icons", `${icon}.js`), "utf8");
  // The build declares the icon as a plain object literal; read it as one.
  const literal = source.split("const __iconData = ")[1].split("\n};")[0];
  const { node } = new Function(`return ${literal}}`)();
  render(tab, node.map((n) => draw(n)).join(""));
  render(`${tab}-filled`, filled(node));
  console.log(`${tab}: ${icon}`);
}
