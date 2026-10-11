import assert from "node:assert/strict";
import test from "node:test";
import { outputs } from "../packages/design/scripts/generate.mjs";
import {
  frontmatterColours,
  namedComponents,
  oklchToHex,
  paletteFrom,
  stepNames,
} from "./check-design-docs.mjs";

test("converts OKLCH to the hex DESIGN.md records, with alpha as a fourth byte", () => {
  assert.equal(oklchToHex("oklch(1 0 0)"), "#ffffff");
  assert.equal(oklchToHex("oklch(0.2 0.016 55)"), "#1c140f");
  assert.equal(oklchToHex("oklch(0.8 0.15 72 / 0.16)"), "#f8ac3d29");
});

test("reads both rooms and gives a Tailwind alias its own entry", () => {
  const css = `:root,
[data-theme="light"] {
  --text: oklch(0.2 0.016 55);
  /* a comment */
  --metal: var(--text);
}

[data-theme="dark"] {
  --text: oklch(1 0 0);
  --metal: var(--text);
}

@theme inline {
  --color-text: var(--text);
  --color-grade-easy: var(--text);
}
`;
  assert.deepEqual(paletteFrom(css), [
    ["text", "#1c140f"],
    ["metal", "#1c140f"],
    ["grade-easy", "#1c140f"],
    ["dark-text", "#ffffff"],
    ["dark-metal", "#ffffff"],
    ["dark-grade-easy", "#ffffff"],
  ]);
});

test("mixes in oklab, lowers lightness relatively, and lets the dark room inherit a constant", () => {
  const css = `:root,
[data-theme="light"] {
  --white: oklch(1 0 0);
  --black: oklch(0 0 0);
  --half: color-mix(in oklab, var(--white) 50%, var(--black));
  --dimmer: oklch(from var(--white) calc(l - 0.5) c h / 0.5);
}

[data-theme="dark"] {
  --white: oklch(0.9 0 0);
}

@theme inline {
}
`;
  assert.deepEqual(paletteFrom(css), [
    ["white", "#ffffff"],
    ["black", "#000000"],
    ["half", "#636363"],
    ["dimmer", "#63636380"],
    ["dark-white", "#dedede"],
    ["dark-black", "#000000"],
    ["dark-half", "#555555"],
    ["dark-dimmer", "#48484880"],
  ]);
});

test("generates the phone's values from tokens.css", () => {
  const generated = outputs();
  assert.match(generated["packages/design/src/tokens.gen.ts"], /"light-1": "#[0-9a-f]{6}"/);
  assert.match(generated["packages/design/uniwind.gen.css"], /--color-amber: #/);
  assert.doesNotMatch(generated["packages/design/uniwind.gen.css"], /--text-/);
});

test("names the type steps a theme sets, without their line heights", () => {
  const css =
    "@theme {\n  --text-xs: 12px;\n  --text-xs--line-height: 1.4;\n  --radius-sm: 10px;\n  --text-lg: 20px;\n}\n";
  assert.deepEqual(stepNames(css, "@theme"), ["xs", "lg"]);
});

test("reads the colours out of the frontmatter", () => {
  const markdown = '---\ncolors:\n  canvas: "#f8f6f4"\n  edge: "#2013081a"\ntypography:\n';
  assert.deepEqual(frontmatterColours(markdown).entries, [
    ["canvas", "#f8f6f4"],
    ["edge", "#2013081a"],
  ]);
});

test("names components in code font, but not strings quoted in examples", () => {
  const markdown =
    "Use `StartPanel` or `NoResults`, not `text-muted`.\n\n```tsx\n<NoResults title={t`Nothing`} />\n```\n";
  assert.deepEqual(namedComponents(markdown), ["StartPanel", "NoResults"]);
});
