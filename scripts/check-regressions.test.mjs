import assert from "node:assert/strict";
import test from "node:test";
import {
  check,
  claimProblems,
  definedProperties,
  propertyProblems,
  shadowProblems,
  storageKeyProblems,
} from "./check-regressions.mjs";

test("catches the retired claim that cards return just before you forget", () => {
  assert.equal(
    claimProblems("x.tsx", "Lymi brings each card back just before you’d forget it.").length,
    1,
  );
  assert.equal(claimProblems("x.tsx", "right before you forget").length, 1);
  assert.deepEqual(claimProblems("x.tsx", "Lymi brings it back just as it starts to fade."), []);
});

test("catches a shadow under the same variants as an edge", () => {
  const found = shadowProblems("x.tsx", 'className="rounded-xl bg-plate edge shadow-sm"');
  assert.equal(found.length, 1);
  assert.match(found[0], /shadow-sm never draws beside edge/);
  assert.equal(
    shadowProblems(
      "x.tsx",
      '<div className="edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]">',
    ).length,
    1,
  );
});

test("lets a shadow under other variants or with importance through", () => {
  assert.deepEqual(
    shadowProblems(
      "x.tsx",
      'className="edge focus-within:edge-strong has-aria-invalid:shadow-[0_0_0_1px_var(--danger)]"',
    ),
    [],
  );
  assert.deepEqual(shadowProblems("x.tsx", 'className="edge !shadow-sm"'), []);
  assert.deepEqual(shadowProblems("x.tsx", 'className="border-edge shadow-sm"'), []);
  assert.deepEqual(shadowProblems("x.tsx", 'className="edge-drop"'), []);
});

test("catches a custom property no stylesheet of the app defines", () => {
  const defined = definedProperties(":root { --lantern-pool: red; }");
  const found = propertyProblems(
    "x.tsx",
    'className="bg-[radial-gradient(var(--color-lantern-pool),transparent)]"',
    defined,
  );
  assert.equal(found.length, 1);
  assert.match(found[0], /--color-lantern-pool is not defined/);
  assert.deepEqual(propertyProblems("x.tsx", "background: var(--lantern-pool);", defined), []);
});

test("lets fallbacks, Base UI's own properties and style objects through", () => {
  const defined = definedProperties(
    'const style = { "--x": "4px" }; el.style.setProperty("--y", "1");',
  );
  assert.deepEqual(
    propertyProblems("x.css", "color-mix(in oklab, red var(--room, 34%), transparent)", defined),
    [],
  );
  assert.deepEqual(
    propertyProblems("x.tsx", 'className="w-(--anchor-width) h-(--drawer-height)"', defined),
    [],
  );
  assert.deepEqual(propertyProblems("x.tsx", "translate: var(--x) var(--y);", defined), []);
});

test("catches a storage key written out in two files", () => {
  const found = storageKeyProblems([
    ["lib/persisted.ts", 'const KEYS = ["lymi-reveals"]; localStorage.removeItem(k);'],
    ["lib/reveal-nudge.ts", 'const KEY = "lymi-reveals"; localStorage.getItem(KEY);'],
  ]);
  assert.equal(found.length, 1);
  assert.match(
    found[0],
    /lymi-reveals is written out in lib\/persisted.ts and lib\/reveal-nudge.ts/,
  );
});

test("scans storage-keys.ts even when nothing in it names a storage API", () => {
  const found = storageKeyProblems([
    ["lib/storage-keys.ts", 'export const REVEALS_KEY = "lymi-reveals";'],
    ["lib/reveal-nudge.ts", 'localStorage.getItem("lymi-reveals");'],
  ]);
  assert.equal(found.length, 1);
});

test("ignores a lymi- name in a file that keeps nothing in storage", () => {
  assert.deepEqual(
    storageKeyProblems([
      ["server/join-page.ts", 'export const ID = "lymi-join-preview";'],
      ["routes/join.tsx", 'document.getElementById("lymi-join-preview");'],
    ]),
    [],
  );
});

test("the repository has none of these bugs", () => {
  assert.deepEqual(check(), []);
});
