#!/usr/bin/env node

// Derives what cannot read tokens.css and tray.css from them: src/tokens.gen.ts for the phone's SVG paint, native
// views and widgets, and uniwind.gen.css for the phone's class names. scripts/check-design-docs.mjs
// fails when either is stale; run this, or that script with --write, after changing a token.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");

export const LIGHT = ':root,\n[data-theme="light"]';
export const DARK = '[data-theme="dark"]';
export const THEME = "@theme inline";

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

const NUMBER = String.raw`(-?[\d.]+)`;
const OKLCH = new RegExp(
  String.raw`^oklch\(\s*${NUMBER}\s+${NUMBER}\s+${NUMBER}\s*(?:\/\s*${NUMBER}\s*)?\)$`,
);
const RELATIVE = new RegExp(
  String.raw`^oklch\(from (.+) calc\(l - ${NUMBER}\) c h\s*(?:\/\s*${NUMBER}\s*)?\)$`,
);
const MIX = new RegExp(
  String.raw`^color-mix\(in oklab,\s*(.+?)\s+${NUMBER}%,\s*(.+?)(?:\s+${NUMBER}%)?\)$`,
);

/**
 * A colour as OKLab with alpha, from the forms tokens.css uses: oklch(), var(), relative oklch()
 * that lowers lightness, and color-mix() in oklab. Undefined for anything that is not a colour.
 */
export function parse(value, vars = {}, seen = []) {
  const v = value.trim();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) {
    if (seen.includes(ref[1]) || !(ref[1] in vars)) throw new Error(`Cannot resolve ${v}`);
    return parse(vars[ref[1]], vars, [...seen, ref[1]]);
  }
  const lch = v.match(OKLCH);
  if (lch) {
    const [L, C, H] = lch.slice(1, 4).map(Number);
    return {
      L,
      a: C * Math.cos((H * Math.PI) / 180),
      b: C * Math.sin((H * Math.PI) / 180),
      alpha: lch[4] === undefined ? 1 : Number(lch[4]),
    };
  }
  const relative = v.match(RELATIVE);
  if (relative) {
    const from = parse(relative[1], vars, seen);
    if (!from) throw new Error(`Not a colour: ${relative[1]}`);
    return {
      ...from,
      L: from.L - Number(relative[2]),
      alpha: relative[3] === undefined ? from.alpha : Number(relative[3]),
    };
  }
  const mix = v.match(MIX);
  if (mix) {
    const x = parse(mix[1], vars, seen);
    const y = parse(mix[3], vars, seen);
    if (!x || !y) throw new Error(`Not a colour mix: ${v}`);
    const p = Number(mix[2]) / 100;
    // Premultiplied, as CSS mixes colours with alpha.
    const alpha = x.alpha * p + y.alpha * (1 - p);
    const channel = (k) => (x[k] * x.alpha * p + y[k] * y.alpha * (1 - p)) / (alpha || 1);
    return { L: channel("L"), a: channel("a"), b: channel("b"), alpha };
  }
  return undefined;
}

/** sRGB hex, with alpha as a fourth byte when the colour is translucent. */
export function hex({ L, a, b, alpha }) {
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

export function oklchToHex(value) {
  const colour = parse(value);
  if (!colour) throw new Error(`Not an oklch() colour: ${value}`);
  return hex(colour);
}

function rooms(css) {
  const light = block(css, LIGHT);
  // A token the dark room does not redeclare is the same in both rooms.
  return { light, dark: { ...light, ...block(css, DARK) }, theme: block(css, THEME) };
}

/** The names of every colour, in declaration order, with a Tailwind alias such as grade-easy as its own. */
function colourNames(css) {
  const { light, theme } = rooms(css);
  const names = Object.keys(light).filter((name) => parse(light[name], light));
  for (const [key, value] of Object.entries(theme)) {
    const name = key.replace(/^color-/, "");
    if (key.startsWith("color-") && !names.includes(name) && value.startsWith("var("))
      names.push(name);
  }
  return names;
}

/** Each room's colours as hex, keyed by token name. */
export function palettes(css) {
  const { light, dark, theme } = rooms(css);
  const names = colourNames(css);
  const room = (vars) =>
    Object.fromEntries(
      names.map((name) => [
        name,
        hex(parse(name in vars ? vars[name] : theme[`color-${name}`], vars)),
      ]),
    );
  return { light: room(light), dark: room(dark) };
}

/** Every colour as `name` and `dark-name`, in declaration order. */
export function paletteFrom(css) {
  const { light, dark } = palettes(css);
  return [
    ...Object.entries(light),
    ...Object.entries(dark).map(([name, value]) => [`dark-${name}`, value]),
  ];
}

/** Box shadows with every colour in hex, which React Native's boxShadow reads. */
function shadows(css) {
  const { light, dark } = rooms(css);
  const names = ["lift", "well", "lit-glow", "glass-drop"];
  const colour = /oklch\([^()]*\)|var\(--[a-z0-9-]+\)/g;
  const room = (vars) =>
    Object.fromEntries(
      names.map((name) => [
        name,
        vars[name].replace(/\s+/g, " ").replace(colour, (c) => hex(parse(c, vars))),
      ]),
    );
  return { light: room(light), dark: room(dark) };
}

function scale(css) {
  const { theme } = rooms(css);
  const pick = (prefix) =>
    Object.entries(theme)
      .filter(([name]) => name.startsWith(prefix) && !name.endsWith("--line-height"))
      .map(([name, value]) => [name.slice(prefix.length), value]);
  const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return {
    radius: Object.fromEntries(pick("radius-").map(([n, v]) => [n, Number.parseFloat(v)])),
    ease: Object.fromEntries(
      pick("ease-").map(([n, v]) => {
        const curve = v.match(/^cubic-bezier\(([^)]+)\)$/);
        if (!curve) throw new Error(`--ease-${n} is not a cubic-bezier()`);
        return [camel(n), curve[1].split(",").map(Number)];
      }),
    ),
    textSteps: pick("text-").map(([n]) => n),
  };
}

/** Each script's faces from `--face-<code>` on `:root`, keyed by its ISO 15924 code: Jpan. */
function faces(css) {
  return Object.fromEntries(
    Object.entries(block(css, ":root"))
      .filter(([name]) => name.startsWith("face-"))
      .map(([name, value]) => [
        name.charAt(5).toUpperCase() + name.slice(6),
        value.split(",").map((family) => family.trim().replace(/^"|"$/g, "")),
      ]),
  );
}

/** A value as TypeScript source in the shape Biome formats it to, so the check compares exactly. */
function literal(value, indent = "") {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "number")) return `[${value.join(", ")}]`;
    // A nested list that fits on its line stays on it, as Biome prints it; 8 is "light: " and ",".
    const line = `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    if (
      indent &&
      value.every((v) => typeof v === "string") &&
      indent.length + line.length + 8 <= 100
    )
      return line;
    return `[\n${value.map((v) => `${inner}${literal(v, inner)},`).join("\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    const key = (k) => (/^[a-zA-Z_]\w*$/.test(k) ? k : JSON.stringify(k));
    const lines = Object.entries(value).map(([k, v]) => `${inner}${key(k)}: ${literal(v, inner)},`);
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/**
 * The eight deck hues as each surface wears them, in sRGB hex, from tray.css: a tile's tray, a deck
 * page's cover and a shelf page's pool, by day and at night, and the card a tray holds at night.
 */
export function huesFrom(tray) {
  const hues = Array.from({ length: 8 }, (_, at) => block(tray, `[data-hue="${at}"]`)["tray-h"]);
  const step = (selector) => {
    const { "tray-l": l, "tray-c": c } = block(tray, selector);
    return hues.map((h) => oklchToHex(`oklch(${l} ${c} ${h})`));
  };
  const surface = (selector) => ({ light: step(selector), dark: step(`${DARK} ${selector}`) });
  return {
    tray: surface(".deck-tray"),
    cover: surface(".deck-cover"),
    pool: surface(".shelf-hero::before"),
    nightCard: oklchToHex(block(tray, `${DARK} .deck-tray`)["tray-card"]),
  };
}

/** The generated files, keyed by their path from the repository root. */
export function outputs(
  css = readFileSync(resolve(root, "tokens.css"), "utf8"),
  tray = readFileSync(resolve(root, "tray.css"), "utf8"),
) {
  const palette = palettes(css);
  const { radius, ease, textSteps } = scale(css);
  const ts = `// Generated by packages/design/scripts/generate.mjs from tokens.css. Do not edit.

/** Each room's colours in sRGB hex, for what cannot read CSS: SVG paint, native views, widgets. */
export const palette = ${literal(palette)} as const;

export type Colour = keyof typeof palette.light;

/** Each room's box shadows, with their colours in hex. */
export const shadows = ${literal(shadows(css))} as const;

/** Corner radii in px. */
export const radius = ${literal(radius)} as const;

/** The curves, as cubic-bezier control points. */
export const ease = ${literal(ease)} as const;

/** The type scale's step names. Each app sets its own size per step. */
export const textSteps = ${literal(textSteps)} as const;

/** Each script's faces in order, keyed by ISO 15924 code, for the scripts Onest has none of. */
export const faces = ${literal(faces(css))} as const;

/** The eight deck hues per surface and room, from tray.css, indexed by core's \`trayHue\`. */
export const hues = ${literal(huesFrom(tray))} as const;
`;

  const variables = (room) =>
    Object.entries(room).map(([name, value]) => `      --color-${name}: ${value};`);
  const css4 = `/* Generated by packages/design/scripts/generate.mjs from tokens.css. Do not edit. */

@theme {
  --font-sans: "Onest";
${Object.entries(radius)
  .map(([name, px]) => `  --radius-${name}: ${px}px;`)
  .join("\n")}
}

@layer theme {
  :root {
    @variant light {
${variables(palette.light).join("\n")}
    }
    @variant dark {
${variables(palette.dark).join("\n")}
    }
  }
}
`;
  return {
    "packages/design/src/tokens.gen.ts": ts,
    "packages/design/uniwind.gen.css": css4,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [path, content] of Object.entries(outputs()))
    writeFileSync(resolve(root, "../..", path), content);
  console.log("Wrote packages/design/src/tokens.gen.ts and uniwind.gen.css.");
}
