import assert from "node:assert/strict";
import test from "node:test";
import { check, exportsOf, testOnlyExports } from "./check-test-only-exports.mjs";

const NONE = new Map();
const run = (files, allowed = NONE) => testOnlyExports(Object.entries(files), allowed);

test("flags an export that only a test reads", () => {
  const found = run({
    "packages/core/src/streak.ts":
      "export function streakLength(days) {\n  return days.length;\n}\n",
    "packages/core/src/streak.test.ts":
      'import { streakLength } from "./streak";\nstreakLength([]);\n',
  });
  assert.equal(found.length, 1);
  assert.match(found[0], /^packages\/core\/src\/streak\.ts: only tests read streakLength/);
});

test("lets an export through that production reads, from code, Astro or config", () => {
  const spec = 'import { a, b, C } from "./m";\n';
  assert.deepEqual(
    run({
      "src/m.ts": "export const a = 1;\nexport const b = 2;\nexport class C {}\n",
      "src/m.test.ts": spec,
      "src/use.tsx": 'import { a } from "./m";\nexport const x = <div>{a}</div>;\n',
      "src/Page.astro": '---\nimport { b } from "./m";\n---\n<p>{b}</p>\n',
      "wrangler.jsonc": '{ "class_name": "C" }\n',
    }),
    [],
  );
});

test("lets a helper through that its module uses, so a pure piece can have a unit test", () => {
  assert.deepEqual(
    run({
      "src/lesson.ts":
        "export function plural(n) {\n  return n === 1 ? 'one' : 'many';\n}\nexport const label = plural(2);\n",
      "src/lesson.test.ts": 'import { plural } from "./lesson";\n',
      "src/page.ts": 'import { label } from "./lesson";\n',
    }),
    [],
  );
});

test("does not count a barrel's re-export as a reader", () => {
  const found = run({
    "src/streak.ts": "export function bestStreak(days) {\n  return 0;\n}\n",
    "src/index.ts": 'export { bestStreak } from "./streak";\nexport * from "./other";\n',
    "src/streak.test.ts": 'import { bestStreak } from ".";\n',
  });
  assert.equal(found.length, 1);
  assert.match(found[0], /src\/streak\.ts: only tests read bestStreak/);
});

test("counts a barrel that renames an export as reading the original name", () => {
  assert.deepEqual(
    run({
      "src/a.ts": "export function helper() {}\n",
      "src/index.ts": 'export { helper as publicHelper } from "./a";\n',
      "src/app.ts": 'import { publicHelper } from ".";\npublicHelper();\n',
      "src/a.test.ts": 'import { helper } from "./a";\nhelper();\n',
    }),
    [],
  );
});

test("counts tests, e2e specs and the test harness as tests", () => {
  for (const reader of [
    "e2e/review.spec.ts",
    "e2e/auth.ts",
    "apps/web/src/server/test-app.ts",
    "apps/web/src/client/test/plate.ts",
    "apps/site/src/lib/learn/checks/order.ts",
    "packages/core/vitest.config.ts",
  ]) {
    const found = run({ "src/m.ts": "export const only = 1;\n", [reader]: "only;\n" });
    assert.equal(found.length, 1, reader);
  }
});

test("does not count a comment, a path or a script key as a reader", () => {
  const found = run({
    "src/run.ts": "export function regressions() {}\n",
    "src/run.test.ts": "regressions();\n",
    "scripts/check.mjs":
      "// See regressions in src/run.ts.\n/* regressions */\nimport './check-regressions.mjs';\n",
    "package.json": '{ "scripts": { "check:regressions": "node x" } }\n',
  });
  assert.equal(found.length, 1);
  assert.match(found[0], /src\/run\.ts: only tests read regressions/);
});

test("counts a generated file as a reader and a CI script named test- as production", () => {
  assert.deepEqual(
    run({
      "src/routes/__root.tsx": "export const Route = 1;\n",
      "src/routes/__root.test.tsx": "Route;\n",
      "src/routeTree.gen.ts": 'import { Route } from "./routes/__root";\n',
      "scripts/test-plan.mjs": "export const plan = 1;\n",
      "scripts/test-plan.test.mjs": "plan;\n",
      "scripts/ci-plan.mjs": 'import { plan } from "./test-plan.mjs";\n',
    }),
    [],
  );
});

test("allows a listed export and fails a listed one that production now reads", () => {
  const files = {
    "src/writes.ts": "export function resetWriteCache() {}\n",
    "src/writes.test.ts": "resetWriteCache();\n",
  };
  const allowed = new Map([["src/writes.ts#resetWriteCache", "stands in for a restart"]]);
  assert.deepEqual(run(files, allowed), []);
  const read = run({ ...files, "src/app.ts": "resetWriteCache();\n" }, allowed);
  assert.equal(read.length, 1);
  assert.match(read[0], /src\/writes\.ts#resetWriteCache is in ALLOWED/);
});

test("reads declarations, export lists and named re-exports", () => {
  const found = exportsOf(
    [
      "export async function load() {}",
      "export type View = { id: string };",
      "export interface Props {}",
      "const inner = 1;",
      "function used() {}",
      "used();",
      "export { inner as outer, used };",
      'export { hintable } from "@lymi/core";',
      "export default load;",
    ].join("\n"),
  );
  assert.deepEqual(Object.fromEntries(found), {
    load: 1,
    View: 0,
    Props: 0,
    hintable: 0,
    outer: 0,
    used: 1,
  });
});

test("the repository exports nothing only tests read", () => {
  assert.deepEqual(check(), []);
});
