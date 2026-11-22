#!/usr/bin/env node

// Keeps every copy of the tokens true to packages/design/tokens.css: the phone's generated values and
// its type ramp's step names. DESIGN.md holds direction, not values, so its frontmatter may name the
// system and nothing else. It also checks that every component a design doc names in code font is
// exported somewhere. `--write` regenerates the generated files.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  block,
  DARK,
  LIGHT,
  oklchToHex,
  outputs,
  paletteFrom,
  THEME,
} from "../packages/design/scripts/generate.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

export { block, oklchToHex, paletteFrom };

/** The keys of a Markdown file's frontmatter, in order. */
export function frontmatterKeys(markdown) {
  const front = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  return front ? [...front[1].matchAll(/^([A-Za-z][\w-]*):/gm)].map((m) => m[1]) : [];
}

function exportsOf(source, file) {
  const names = new Set();
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
  if (file.endsWith(".astro")) names.add(file.replace(".astro", ""));
  return names;
}

function exportedVariants() {
  const exported = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path);
      } else if (/\.(tsx?|astro)$/.test(entry.name)) {
        const source = read(path);
        const variants = variantsIn(source);
        for (const name of exportsOf(source, entry.name))
          exported.set(name, [...(exported.get(name) ?? []), ...variants]);
      }
    }
  };
  for (const dir of [
    "apps/web/src",
    "apps/site/src",
    "apps/mobile/src",
    "packages/core/src",
    "packages/design/src",
  ])
    walk(dir);
  return exported;
}

export function variantsIn(source) {
  const literals = (type) => [...type.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  return [...source.matchAll(/\bvariant\??:\s*([^;,=)]+)/g)].flatMap(([, type]) => [
    ...literals(type),
    ...[...type.matchAll(/\b[A-Z]\w*/g)].flatMap(([alias]) =>
      literals(new RegExp(`type ${alias} =([^;]+);`).exec(source)?.[1] ?? ""),
    ),
  ]);
}

export function namedVariants(markdown) {
  const correct = markdown.replace(/^\/\/ Incorrect[\s\S]*?(?=^\/\/ Correct|^```)/gm, "");
  const named = [
    ...correct.matchAll(
      /\b([A-Z]\w+)(?:`? with `| )(?:[\w-]+=(?:"[^"]*"|\{[^}]*\}) )*variant="([\w-]+)"/g,
    ),
  ].map((m) => [m[1], m[2]]);
  const prose = correct.replace(/^```[\s\S]*?^```/gm, "");
  const lists = [
    ...prose.matchAll(/`([A-Z]\w+)`[^.`\n]*\bvariants?:([^.\n]+)/g),
    ...prose.matchAll(/^## (\w+) variants\n+Variants:([^.\n]+)/gm),
  ];
  for (const [, component, list] of lists)
    for (const m of list.matchAll(/`([a-z][\w-]*)`/g)) named.push([component, m[1]]);
  return named;
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

/** The type steps each app's styles must name: the phone sets its own size under the same names. */
export function stepNames(css, selector) {
  return Object.keys(block(css, selector))
    .filter((name) => name.startsWith("text-") && !name.endsWith("--line-height"))
    .map((name) => name.slice("text-".length));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = read("packages/design/tokens.css");
  const write = process.argv.includes("--write");
  const problems = [];

  // A value copied into DESIGN.md drifts from tokens.css; the values live there and on /design.
  for (const key of frontmatterKeys(read("DESIGN.md")))
    if (key !== "name" && key !== "description")
      problems.push(
        `DESIGN.md frontmatter has ${key}:, but values live in packages/design/tokens.css`,
      );

  for (const [path, content] of Object.entries(outputs(css))) {
    if (write) writeFileSync(resolve(root, path), content);
    else if (read(path) !== content) problems.push(`${path} is stale against tokens.css`);
  }

  // The web and the site import the tokens; a room redeclared in their styles would shadow them.
  for (const path of ["apps/web/src/client/styles.css", "apps/site/src/styles.css"]) {
    const styles = read(path);
    if (!styles.includes('@import "@lymi/design/tokens.css";'))
      problems.push(`${path} does not import @lymi/design/tokens.css`);
    for (const selector of [LIGHT, DARK, ":root", THEME])
      if (styles.includes(`${selector} {`))
        problems.push(`${path} declares ${selector}, which packages/design/tokens.css owns`);
  }

  const steps = stepNames(css, THEME);
  const phone = stepNames(read("apps/mobile/src/global.css"), "@theme");
  if (JSON.stringify(phone) !== JSON.stringify(steps))
    problems.push(
      `apps/mobile/src/global.css sets the type steps ${phone.join(" ")}; tokens.css names ${steps.join(" ")}`,
    );

  const exported = exportedVariants();
  for (const path of designDocs()) {
    const markdown = read(path);
    for (const name of new Set(namedComponents(markdown)))
      if (!exported.has(name)) problems.push(`${path} names \`${name}\`, which nothing exports`);
    for (const [name, variant] of namedVariants(markdown)) {
      const variants = new Set(exported.get(name));
      if (variants.size > 0 && !variants.has(variant))
        problems.push(
          `${path} gives \`${name}\` the variant \`${variant}\`, but its source has ${[...variants].join(", ")}`,
        );
    }
  }

  if (problems.length > 0) {
    console.error(
      `${problems.join("\n")}\n\nRun \`node scripts/check-design-docs.mjs --write\` for colours and generated files; fix the rest by hand.`,
    );
    process.exit(1);
  }
}
