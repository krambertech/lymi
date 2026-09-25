import assert from "node:assert/strict";
import test from "node:test";
import {
  frontmatterColours,
  namedComponents,
  oklchToHex,
  paletteFrom,
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
