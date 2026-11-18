import assert from "node:assert/strict";
import test from "node:test";
import { globToRegExp, parseDiff, report, triggered } from "./reliability.mjs";
import { ITEMS } from "./reliability-checklist.mjs";

const DIFF = `diff --git a/apps/web/src/server/services/review.ts b/apps/web/src/server/services/review.ts
--- a/apps/web/src/server/services/review.ts
+++ b/apps/web/src/server/services/review.ts
@@ -10,0 +11,2 @@
+  const due = state.due;
+  return due;
diff --git a/docs/old.md b/docs/old.md
--- a/docs/old.md
+++ /dev/null
@@ -1 +0,0 @@
-gone
`;

test("reads changed files and their added lines from a diff", () => {
  const files = parseDiff(DIFF);
  assert.deepEqual(files.get("apps/web/src/server/services/review.ts"), [
    "  const due = state.due;",
    "  return due;",
  ]);
  assert.deepEqual(files.get("docs/old.md"), []);
});

test("matches globs the way the checklist writes them", () => {
  assert.ok(globToRegExp("apps/web/**/*.ts").test("apps/web/src/server/x.ts"));
  assert.ok(globToRegExp("apps/web/**/*.ts").test("apps/web/x.ts"));
  assert.ok(!globToRegExp("apps/web/*.ts").test("apps/web/src/x.ts"));
  assert.ok(globToRegExp("**/*.{ts,tsx}").test("a/b.tsx"));
  assert.ok(!globToRegExp("**/*.{ts,tsx}").test("a/b.mjs"));
  assert.ok(globToRegExp("apps/web/migrations/*.sql").test("apps/web/migrations/0042_x.sql"));
});

test("fires an item on a matching path, and on an added line when it asks for one", () => {
  const files = parseDiff(DIFF);
  const onPath = { id: "a", paths: ["apps/web/src/server/**"], check: "", why: "", sources: [1] };
  const onLine = { ...onPath, id: "b", added: /state\.due/ };
  const missed = { ...onPath, id: "c", added: /never/ };
  const ignored = { ...onPath, id: "d", ignore: ["**/review.ts"] };
  const whole = { ...missed, id: "e", files: ["docs/*.md"] };
  const fired = triggered([onPath, onLine, missed, ignored, whole], files);
  assert.deepEqual(
    fired.map((f) => f.item.id),
    ["a", "b", "e"],
  );
  assert.equal(fired[1].hits[0].line, "const due = state.due;");
});

test("reports each matched item with its check, evidence and trigger", () => {
  const item = { id: "x", paths: ["**"], check: "Ask this.", why: "It broke.", sources: [7, 9] };
  const text = report(triggered([item], parseDiff(DIFF)), { base: "origin/main", fromBase: true });
  assert.match(text, /### x/);
  assert.match(text, /Ask this\./);
  assert.match(text, /Evidence: #7, #9/);
  assert.match(text, /review\.ts/);
  assert.match(
    report([], { base: "origin/main", fromBase: true }),
    /No reliability checklist item/,
  );
});

test("every checklist item can fire and names its evidence", () => {
  const ids = new Set();
  for (const item of ITEMS) {
    assert.match(item.id, /^[a-z0-9-]+$/, item.id);
    assert.ok(!ids.has(item.id), `${item.id} is listed twice`);
    ids.add(item.id);
    assert.ok((item.paths ?? []).length + (item.files ?? []).length > 0, `${item.id} has no paths`);
    if (item.added) assert.ok(item.paths?.length, `${item.id}: added needs paths`);
    assert.ok(item.check.endsWith("?"), `${item.id}: the check is a question`);
    assert.ok(item.why.length > 0, `${item.id} says why`);
    assert.ok(item.sources.length > 0, `${item.id} names a pull request`);
    assert.ok(item.example, `${item.id} has an example that fires it`);
    const files = new Map([[item.example.file, item.example.line ? [item.example.line] : []]]);
    assert.equal(triggered([item], files).length, 1, `${item.id} does not fire on its example`);
  }
});
