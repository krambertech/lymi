// Turns every icon in src/ui/icons.tsx into a custom SF Symbol, so iOS's own menus draw Lymi's
// Lucide icons. Writes assets/symbols/lymi.<name>.symbolset; plugins/with-symbols.cjs copies them
// into the app's asset catalog at prebuild.
//
//   node scripts/symbols.mjs           regenerate (needs `brew install swiftdraw`)
//   node scripts/symbols.mjs --check   fail when an icon has no symbol, for CI

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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "assets/symbols");
const lucide = join(root, "node_modules/lucide-react-native/dist/esm/icons");

/** The registry's names and the Lucide component each one draws. */
function registry() {
  const source = readFileSync(join(root, "src/ui/icons.tsx"), "utf8");
  const block = source.slice(source.indexOf("const ICONS = {"));
  const body = block.slice(0, block.indexOf("\n};"));
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
  const literal = source.slice(
    source.indexOf("{", source.indexOf("const __iconData")),
    source.indexOf("};") + 1,
  );
  const __iconData = new Function(`return (${literal});`)();
  const children = __iconData.node.map(([tag, props]) => `<${tag} ${attrs(props)}/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

const icons = registry();

if (process.argv.includes("--check")) {
  const have = new Set(existsSync(out) ? readdirSync(out) : []);
  const missing = icons.filter(({ name }) => !have.has(`${symbolName(name)}.symbolset`));
  // An icon Lymi draws itself, with no Lucide file behind it, has no symbol and falls back to none.
  const skipped = missing.filter(({ component }) => !fileOf(component));
  const real = missing.filter((m) => !skipped.includes(m));
  if (real.length) {
    console.error(
      `No symbol for: ${real.map((m) => m.name).join(", ")}. Run node apps/mobile/scripts/symbols.mjs.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "lymi-symbols-"));
const skipped = [];
for (const { name, component } of icons) {
  const svg = await svgOf(component);
  if (!svg) {
    skipped.push(name);
    continue;
  }
  const input = join(work, `${name}.svg`);
  writeFileSync(input, svg);
  const set = join(out, `${symbolName(name)}.symbolset`);
  mkdirSync(set);
  const file = `${symbolName(name)}.svg`;
  execFileSync("swiftdraw", [input, "--format", "sfsymbol", "--output", join(set, file)]);
  writeFileSync(
    join(set, "Contents.json"),
    `${JSON.stringify({ info: { author: "xcode", version: 1 }, symbols: [{ filename: file, idiom: "universal" }] }, null, 2)}\n`,
  );
}
rmSync(work, { recursive: true, force: true });
console.log(`${icons.length - skipped.length} symbols written to assets/symbols.`);
if (skipped.length) console.log(`No Lucide file, so no symbol: ${skipped.join(", ")}`);
