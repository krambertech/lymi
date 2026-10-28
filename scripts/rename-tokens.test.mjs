import assert from "node:assert/strict";
import test from "node:test";
import { oldTokens, renameTokens } from "./rename-tokens.mjs";

test("renames utilities, custom properties and palette keys", () => {
  assert.equal(
    renameTokens(
      'className="text-text hover:bg-hover [&_svg]:text-text-2 border-edge-2 bg-good/10"',
    ),
    'className="text-ink hover:bg-plate-hover [&_svg]:text-ink-secondary border-edge-strong bg-success/10"',
  );
  assert.equal(
    renameTokens("--color-muted: var(--muted); fill: var(--glass-unlit); --text-2: x; bg-light-1"),
    "--color-ink-muted: var(--ink-muted); fill: var(--lantern-glass-unlit); --ink-secondary: x; bg-lit-low",
  );
  assert.equal(
    renameTokens(
      'colour={p.muted} fill={p["flame-core"]} border={p.text} at={palette.dark["good"]}',
      "apps/mobile/src/x.tsx",
    ),
    'colour={p["ink-muted"]} fill={p["lantern-flame"]} border={p.ink} at={palette.dark.success}',
  );
  assert.equal(
    renameTokens("Marks use `muted`, never `faint`; the `text` field.", "docs/x.md"),
    "Marks use `ink-muted`, never `ink-faint`; the `text` field.",
  );
  assert.equal(
    renameTokens('className="edge-2 bg-plate-2"'),
    'className="edge-strong bg-plate-nested"',
  );
});

test("leaves the type scale, other tokens and ordinary words alone", () => {
  const line =
    'className="text-2xs text-xl text-grade-good bg-rail-hover bg-glass-plate group-hover:opacity-100" muted={p.text()} --lit-glow --text-xs';
  assert.equal(renameTokens(line), line);
  assert.equal(
    renameTokens("<video muted /> a good hover state"),
    "<video muted /> a good hover state",
  );
  assert.equal(
    renameTokens(".map((p) => p.text)", "apps/web/src/server/x.ts"),
    ".map((p) => p.text)",
  );
  assert.equal(
    renameTokens('fill: "flame-core", "glass-unlit": x'),
    'fill: "flame-core", "glass-unlit": x',
  );
});

test("is safe to run twice", () => {
  const once = renameTokens(
    "text-muted var(--glass-unlit) var(--glass) bg-chosen p.metal",
    "apps/mobile/src/x.tsx",
  );
  assert.equal(renameTokens(once), once);
  assert.equal(
    once,
    'text-ink-muted var(--lantern-glass-unlit) var(--lantern-glass) bg-plate-chosen p["lantern-metal"]',
  );
});

test("names each old token with its replacement", () => {
  assert.deepEqual(oldTokens('className="text-text-2 bg-hover"'), [
    { found: "text-2", fix: "ink-secondary" },
    { found: "bg-hover", fix: "bg-plate-hover" },
  ]);
});
