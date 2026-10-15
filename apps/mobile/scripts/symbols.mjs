// Turns every icon in src/ui/icons.tsx into a custom SF Symbol, so iOS's own menus draw Lymi's
// Lucide icons, and draws the controls' two from the lantern. Writes assets/symbols/lymi.<name>.symbolset;
// plugins/with-symbols.cjs copies them into the app's asset catalog at prebuild.
//
//   node scripts/symbols.mjs           regenerate (needs `brew install swiftdraw`)
//   node scripts/symbols.mjs --check   fail when the symbols no longer match the icons, for CI

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LANTERN_BAIL,
  LANTERN_BOUNDS,
  LANTERN_FRAME,
} from "../../../packages/design/src/lantern.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "assets/symbols");
const lucide = join(root, "node_modules/lucide-react-native/dist/esm/icons");

/** The registry's names and the Lucide component each one draws. */
function registry() {
  const source = readFileSync(join(root, "src/ui/icons.tsx"), "utf8");
  const start = source.indexOf("const ICONS = {");
  const body = source.slice(start, source.indexOf("\n}", start));
  return [...body.matchAll(/^\s+(\w+): (\w+),$/gm)].map(([, name, component]) => ({
    name,
    component,
  }));
}

/** Lucide's file for each name it exports, aliases included: BookMarked is book-bookmark.mjs. */
const files = (() => {
  const index = readFileSync(join(lucide, "../lucide-react-native.mjs"), "utf8");
  const map = new Map();
  for (const [, names, file] of index.matchAll(/export \{([^}]*)\} from '\.\/icons\/([^']+)';/g)) {
    for (const [, name] of names.matchAll(/default as (\w+)/g)) map.set(name, join(lucide, file));
  }
  // An index this script can no longer read would make every icon look hand-drawn and pass the check.
  if (map.size < 100) throw new Error("Couldn't read lucide-react-native's export index.");
  return map;
})();

/** The name icons.tsx imports a component under, back to Lucide's: `Image as ImageIcon` is Image. */
const imported = (() => {
  const source = readFileSync(join(root, "src/ui/icons.tsx"), "utf8");
  const block = source.slice(
    source.indexOf("import {"),
    source.indexOf('} from "lucide-react-native"'),
  );
  return new Map([...block.matchAll(/(\w+) as (\w+)/g)].map(([, real, local]) => [local, real]));
})();

const fileOf = (component) => files.get(imported.get(component) ?? component);

const symbolName = (name) => `lymi.${name}`;

/** Lucide's 24-unit box, trimmed by this on each side, spans a little more than the text's cap height, as Apple's symbols do. */
const INSETS = "2.5,2.5,2.5,2.5";

const attrs = (props) =>
  Object.entries(props)
    .filter(([key]) => key !== "key")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${value}"`)
    .join(" ");

/** The icon as a plain SVG with Lucide's own stroke, which SwiftDraw outlines into a symbol. */
async function svgOf(component) {
  const file = fileOf(component);
  if (!file) return null;
  // The module imports React Native, so its plain data is read rather than the module run.
  const source = readFileSync(file, "utf8");
  const start = source.indexOf("{", source.indexOf("const __iconData"));
  const literal = source.slice(start, source.indexOf("};", start) + 1);
  const __iconData = new Function(`return (${literal});`)();
  const children = __iconData.node.map(([tag, props]) => `<${tag} ${attrs(props)}/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

/**
 * Control Center's symbols (targets/controls): the lantern with the control's action in its glass,
 * the metal a shade dimmer. iOS sizes a control's glyph by its shape, so a bare plus or play would
 * fill the whole button. Drawn in the lantern's 120 unit box.
 */
const CONTROLS = {
  controlAdd:
    '<path d="M60 61 V83 M49 72 H71" fill="none" stroke="black" stroke-width="7" stroke-linecap="round"/>',
  controlReview:
    '<path d="M53 61.5 Q53 58 56 59.7 L71.5 69 Q74.5 71 71.5 73 L56 82.3 Q53 84 53 80.5 Z"/>',
};

/** One of the lantern's parts in black; the glass is left open, so the action shows through it. */
function partSvg({ x, y, w, h, r, d, fill, stroke, strokeWidth, round }) {
  const paint = `fill="${fill ? "black" : "none"}"${stroke ? ` stroke="black" stroke-width="${strokeWidth}"` : ""}${round ? ' stroke-linejoin="round"' : ""}`;
  return d
    ? `<path d="${d}" ${paint}/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r ?? 0}" ${paint}/>`;
}

function controlSvg(action) {
  const middle = (LANTERN_BOUNDS.top + LANTERN_BOUNDS.bottom) / 2;
  const metal = [LANTERN_BAIL, ...LANTERN_FRAME].map(partSvg).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="translate(12 12) scale(0.2) translate(-60 -${middle})">${metal}${action}</g></svg>`;
}

/** Marks the action, the last path in each weight, as the primary layer and the metal as secondary. */
function layered(svg) {
  return svg.replace(
    /(<g id="(?:Ultralight|Regular|Black)-S"[^>]*>)([\s\S]*?)<\/g>/g,
    (_, open, body) => {
      const count = body.split("<path ").length - 1;
      let i = 0;
      const marked = body.replace(/<path /g, () =>
        i++ === count - 1
          ? '<path class="monochrome-1 hierarchical-1:primary" '
          : '<path class="monochrome-0 hierarchical-0:secondary" ',
      );
      return `${open}${marked}</g>`;
    },
  );
}

const icons = registry();

/** Each icon with a Lucide original and the file its symbol was made from; the app reads the names. */
const expected = Object.fromEntries([
  ...icons.flatMap(({ name, component }) => {
    const file = fileOf(component);
    return file ? [[name, file.slice(lucide.length + 1)]] : [];
  }),
  ...Object.keys(CONTROLS).map((name) => [name, "packages/design/src/lantern.ts"]),
]);
const manifest = join(out, "manifest.json");

if (process.argv.includes("--check")) {
  const had = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : {};
  const sets = new Set(
    existsSync(out) ? readdirSync(out).filter((f) => f.endsWith(".symbolset")) : [],
  );
  const wrong = Object.keys(expected).filter(
    (name) => had[name] !== expected[name] || !sets.has(`${symbolName(name)}.symbolset`),
  );
  const stale = [...sets].filter((set) => !(set.replace(/^lymi\.|\.symbolset$/g, "") in expected));
  if (wrong.length || stale.length) {
    console.error(
      `Menu symbols are out of date (${[...wrong, ...stale].join(", ")}). Run pnpm --filter @lymi/mobile symbols.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "lymi-symbols-"));
const skipped = [];

function writeSymbol(name, svg, finish = (symbol) => symbol) {
  const input = join(work, `${name}.svg`);
  writeFileSync(input, svg);
  const set = join(out, `${symbolName(name)}.symbolset`);
  mkdirSync(set);
  const file = `${symbolName(name)}.svg`;
  // One inset for every icon keeps Lucide's sizes relative to each other; "auto" would scale each
  // glyph to fill the guides, so a plus would come out as large as a circle.
  execFileSync("swiftdraw", [
    input,
    "--format",
    "sfsymbol",
    "--insets",
    INSETS,
    "--output",
    join(set, file),
  ]);
  writeFileSync(join(set, file), finish(readFileSync(join(set, file), "utf8")));
  writeFileSync(
    join(set, "Contents.json"),
    `${JSON.stringify({ info: { author: "xcode", version: 1 }, symbols: [{ filename: file, idiom: "universal" }] }, null, 2)}\n`,
  );
}

for (const { name, component } of icons) {
  const svg = await svgOf(component);
  if (svg) writeSymbol(name, svg);
  else skipped.push(name);
}
for (const [name, action] of Object.entries(CONTROLS))
  writeSymbol(name, controlSvg(action), layered);
rmSync(work, { recursive: true, force: true });
writeFileSync(manifest, `${JSON.stringify(expected, null, 2)}\n`);
console.log(
  `${icons.length - skipped.length + Object.keys(CONTROLS).length} symbols written to assets/symbols.`,
);
if (skipped.length) console.log(`No Lucide file, so no symbol: ${skipped.join(", ")}`);
