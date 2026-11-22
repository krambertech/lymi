import assert from "node:assert/strict";
import test from "node:test";
import {
  commentsIn,
  compare,
  isDirective,
  measure,
  nextBaseline,
  proseLines,
  serialize,
} from "./check-comments.mjs";

const prose = (file, source) => proseLines(commentsIn(file, source));

test("counts line, block and JSDoc comments by the lines they cover", () => {
  const source = [
    "// one",
    "/**",
    " * two",
    " */",
    "export const a = 1; // trailing",
    "/* inline */ const b = 2;",
  ].join("\n");
  assert.equal(prose("a.ts", source), 1 + 3 + 1 + 1);
});

test("finds comments inside JSX braces", () => {
  const source = "export const A = () => (\n  <div>\n    {/* hidden */}\n  </div>\n);\n";
  assert.equal(prose("a.tsx", source), 1);
});

test("ignores comment markers inside strings, templates, regexes and JSX text", () => {
  const source = [
    'const url = "https://lymi.app/* not */";',
    "const t = `// nope $" + "{url}`;",
    "const r = /\\/\\/x/;",
    "export const A = () => <p>// text, not a comment</p>;",
  ].join("\n");
  assert.equal(prose("a.tsx", source), 0);
});

test("allows tool directives and type tags, but not prose after a JSDoc tag", () => {
  for (const directive of [
    "// oxlint-disable-next-line typescript/no-explicit-any -- the SDK types it as any",
    "/* oxlint-disable react-hooks/exhaustive-deps -- runs once */",
    "// oxlint-enable react-hooks/exhaustive-deps",
    "// @ts-expect-error the fixture is deliberately wrong",
    '/// <reference types="vite/client" />',
    '/** @type {import("x").Config} */',
    "/* @vite-ignore */",
    "/** @internal */",
    "// check-styling: allow, a brand colour",
  ]) {
    assert.equal(isDirective(directive), true, directive);
  }
  assert.equal(isDirective("/** @internal Reserves a page. */"), false);
  assert.equal(isDirective("// TODO: fix later"), false);
});

test("skips the shebang", () => {
  assert.equal(prose("a.mjs", "#!/usr/bin/env node\nconsole.log(1);\n"), 0);
});

test("a file that grows fails, a file that shrinks asks for a lower baseline", () => {
  const counts = measure(["a.ts", "b.ts", "c.ts"], (file) =>
    file === "a.ts" ? "// x\n// y\n" : file === "b.ts" ? "const b = 1;\n" : "// new\n",
  );
  assert.deepEqual(counts, { "a.ts": 2, "c.ts": 1 });
  const { grown, shrunk } = compare({ "a.ts": 3, "b.ts": 1 }, counts);
  assert.deepEqual(grown, [{ file: "c.ts", allowed: 0, actual: 1 }]);
  assert.deepEqual(shrunk, [
    { file: "a.ts", allowed: 3, actual: 2 },
    { file: "b.ts", allowed: 1, actual: 0 },
  ]);
});

test("the baseline is sorted, one file per line", () => {
  assert.equal(serialize({ "b.ts": 1, "a.ts": 2 }), '{\n  "a.ts": 2,\n  "b.ts": 1\n}\n');
});

test("an update lowers the baseline but never raises it", () => {
  assert.deepEqual(nextBaseline({ "a.ts": 3 }, { "a.ts": 2 }), { grown: [], next: { "a.ts": 2 } });
  assert.deepEqual(nextBaseline({ "a.ts": 1 }, { "a.ts": 2, "b.ts": 1 }), {
    grown: [
      { file: "a.ts", allowed: 1, actual: 2 },
      { file: "b.ts", allowed: 0, actual: 1 },
    ],
    next: { "a.ts": 1 },
  });
  assert.deepEqual(nextBaseline(undefined, { "a.ts": 2 }), { grown: [], next: { "a.ts": 2 } });
});
