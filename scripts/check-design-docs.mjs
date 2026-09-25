#!/usr/bin/env node

// Keeps the design docs true to the code: DESIGN.md's colour frontmatter is derived from the product's
// styles.css, the site's copy of the palette matches the product's, and every component a design doc
// names in code font is exported somewhere. `--write` regenerates the frontmatter colours.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

export function oklchToHex(value) {
  const match = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (!match) throw new Error(`Not an oklch() colour: ${value}`);
  const [L, C, H] = match.slice(1, 4).map(Number);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const channel = (x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  const bytes = linear.map(channel);
  if (alpha < 1) bytes.push(Math.round(alpha * 255));
  return `#${bytes.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** The custom properties declared directly inside the first block that opens with `selector {`. */
export function block(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const end = css.indexOf("\n}", start);
  const body = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries(
    [...body.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]),
  );
}

function resolveVar(vars, value, seen = []) {
  const ref = value.match(/^var\(--([a-z0-9-]+)\)$/);
  if (!ref) return value;
  if (seen.includes(ref[1]) || !(ref[1] in vars)) throw new Error(`Cannot resolve ${value}`);
  return resolveVar(vars, vars[ref[1]], [...seen, ref[1]]);
}

/** Every colour the product defines, as `name` and `dark-name`, in declaration order. */
export function paletteFrom(css) {
  const light = block(css, ':root,\n[data-theme="light"]');
  const dark = block(css, '[data-theme="dark"]');
  const theme = block(css, "@theme inline");
  const names = Object.keys(light).filter((name) => /^(oklch|var)\(/.test(light[name]));
  // Tailwind colours that are aliases of another token, such as grade-easy, get their own entry.
  for (const [key, value] of Object.entries(theme)) {
    const name = key.replace(/^color-/, "");
    if (key.startsWith("color-") && !names.includes(name) && value.startsWith("var("))
      names.push(name);
  }
  const hex = (vars, name) =>
    oklchToHex(resolveVar(vars, name in vars ? vars[name] : theme[`color-${name}`]));
  return [
    ...names.map((name) => [name, hex(light, name)]),
    ...names.map((name) => [`dark-${name}`, hex(dark, name)]),
  ];
}

export function frontmatterColours(markdown) {
  const section = markdown.match(/^colors:\n((?: {2}.+\n)+)/m);
  if (!section) throw new Error("DESIGN.md has no colors: frontmatter");
  return {
    text: section[0],
    entries: [...section[1].matchAll(/^ {2}([a-z0-9-]+): "(#[0-9a-f]+)"$/gm)].map((m) => [
      m[1],
      m[2],
    ]),
  };
}

function exportedNames() {
  const names = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path);
      } else if (/\.(tsx?|astro)$/.test(entry.name)) {
        const source = read(path);
        for (const m of source.matchAll(
          /export\s+(?:default\s+)?(?:const|function|class|type|interface)\s+([A-Z]\w*)/g,
        ))
          names.add(m[1]);
        for (const m of source.matchAll(/export\s*\{([^}]+)\}/g))
          for (const part of m[1].split(","))
            names.add(
              part
                .trim()
                .split(/\s+as\s+/)
                .pop(),
            );
        if (entry.name.endsWith(".astro")) names.add(entry.name.replace(".astro", ""));
      }
    }
  };
  for (const dir of ["apps/web/src", "apps/site/src", "packages/core/src"]) walk(dir);
  return names;
}

/** Names in code font outside fenced blocks, whose examples quote interface strings such as t`Search`. */
export function namedComponents(markdown) {
  const prose = markdown.replace(/^```[\s\S]*?^```/gm, "");
  return [...prose.matchAll(/`([A-Z][a-z]+[A-Za-z]*)`/g)].map((m) => m[1]);
}

function designDocs() {
  const dir = "docs/design/system";
  return ["DESIGN.md", ...readdirSync(resolve(root, dir)).map((name) => `${dir}/${name}`)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = read("apps/web/src/client/styles.css");
  const palette = paletteFrom(css);
  const design = read("DESIGN.md");
  const current = frontmatterColours(design);
  const problems = [];

  if (process.argv.includes("--write")) {
    const text = `colors:\n${palette.map(([name, hex]) => `  ${name}: "${hex}"`).join("\n")}\n`;
    writeFileSync(resolve(root, "DESIGN.md"), design.replace(current.text, text));
    console.log(`DESIGN.md: wrote ${palette.length} colours from styles.css`);
  } else if (JSON.stringify(current.entries) !== JSON.stringify(palette)) {
    const want = new Map(palette);
    const have = new Map(current.entries);
    for (const [name, hex] of want)
      if (have.get(name) !== hex)
        problems.push(
          `DESIGN.md colors.${name} is ${have.get(name) ?? "missing"}, styles.css gives ${hex}`,
        );
    for (const name of have.keys())
      if (!want.has(name)) problems.push(`DESIGN.md colors.${name} has no token in styles.css`);
    if (problems.length === 0) problems.push("DESIGN.md colors are out of order with styles.css");
  }

  const site = read("apps/site/src/styles.css");
  for (const selector of [':root,\n[data-theme="light"]', '[data-theme="dark"]']) {
    const product = block(css, selector);
    const theirs = block(site, selector);
    for (const [name, value] of Object.entries(product))
      if (name in theirs && theirs[name] !== value)
        problems.push(
          `apps/site styles.css --${name} is ${theirs[name]}, the product's is ${value}`,
        );
  }

  const exported = exportedNames();
  for (const path of designDocs())
    for (const name of new Set(namedComponents(read(path))))
      if (!exported.has(name)) problems.push(`${path} names \`${name}\`, which nothing exports`);

  if (problems.length > 0) {
    console.error(
      `${problems.join("\n")}\n\nRun \`node scripts/check-design-docs.mjs --write\` for colours; fix names by hand.`,
    );
    process.exit(1);
  }
}
