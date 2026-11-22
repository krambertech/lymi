import assert from "node:assert/strict";
import { test } from "node:test";
import { lint } from "../test/run.mjs";

const NEW =
  "Write no comments: say the reason in a name, a type, a test, or the doc or ADR that owns it (CODING_STANDARDS.md#write-no-comments).";

const run = (filename, code, baseline = {}) =>
  lint("no-comments", filename, code, {
    options: (dir) => ({ root: dir, baseline: "baseline.json" }),
    files: { "baseline.json": JSON.stringify(baseline) },
  });

test("reports every comment in a file the baseline does not list", () => {
  const found = run("a.ts", "// one\nexport const a = 1; /* two */\n/**\n * three\n */\n");
  assert.deepEqual(
    found.map(({ text }) => text),
    ["// one", "/* two */", "/**\n * three\n */"],
  );
  for (const { message } of found) assert.equal(message, NEW);
});

test("finds comments inside JSX braces", () => {
  const found = run(
    "a.tsx",
    "export const A = () => (\n  <div>\n    {/* hidden */}\n  </div>\n);\n",
  );
  assert.deepEqual(
    found.map(({ text }) => text),
    ["/* hidden */"],
  );
});

test("leaves directives, the shebang, strings and JSX text alone", () => {
  const code = [
    "#!/usr/bin/env node",
    "// oxlint-disable-next-line eslint/no-console -- prints the result",
    "console.log(1);",
    "/* oxlint-disable react-hooks/exhaustive-deps -- runs once */",
    "// oxlint-enable react-hooks/exhaustive-deps",
    "// @ts-expect-error the fixture is deliberately wrong",
    '/** @type {import("x").Config} */',
    'const url = "https://lymi.app/* not */";',
    "export const A = () => <p>// text, not a comment</p>;",
  ].join("\n");
  assert.deepEqual(run("a.tsx", code), []);
});

test("an older file may keep the comment lines its baseline allows", () => {
  assert.deepEqual(run("old.ts", "// one\n// two\nexport const a = 1;\n", { "old.ts": 2 }), []);
});

test("an older file that grows is reported once, on its last comment", () => {
  const found = run("old.ts", "// one\n// two\n// three\nexport const a = 1;\n", { "old.ts": 2 });
  assert.deepEqual(found, [
    {
      code: "lymi(no-comments)",
      message:
        "This file has 3 comment lines and may keep 2. Delete one rather than adding one (CODING_STANDARDS.md#write-no-comments).",
      text: "// three",
    },
  ]);
});

test("skips generated files and file types the baseline does not measure", () => {
  assert.deepEqual(run("tokens.gen.ts", "// Generated.\nexport const a = 1;\n"), []);
});
