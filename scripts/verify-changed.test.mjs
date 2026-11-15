import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { changedPaths, planSteps, routeTreeIsCurrent } from "./verify-changed.mjs";

const base = "abc123";

test("a screen change runs static checks and the changed tests on desktop Chromium", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/src/client/routes/today.tsx"],
    routeTreeCurrent: true,
  });

  assert.deepEqual(
    steps.map((step) => step.args.join(" ")),
    [
      "check",
      "i18n:check",
      "check:migrations",
      "typecheck",
      `--filter @lymi/core exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/client exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/design exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/web exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/site exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/mobile exec vitest run --changed ${base} --passWithNoTests`,
    ],
  );
  const web = steps.find((step) => step.args.includes("@lymi/web"));
  assert.deepEqual(web.env, { LYMI_COMPONENT_INSTANCES: "desktop" });
});

test("a primitive change keeps every component instance", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/src/client/components/ui/dialog.tsx"],
    routeTreeCurrent: true,
  });
  const web = steps.find((step) => step.args.includes("@lymi/web"));
  assert.deepEqual(web.env, { LYMI_COMPONENT_INSTANCES: "desktop,touch,touch-webkit" });
});

test("configuration the tests depend on hands over to the full gate", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/migrations/0031_x.sql"],
    routeTreeCurrent: true,
  });
  assert.deepEqual(
    steps.map((step) => step.args),
    [["verify"]],
  );
});

test("a missing or stale route tree builds the product before typechecking", () => {
  const steps = planSteps({ base, paths: ["packages/core/src/fsrs.ts"], routeTreeCurrent: false });
  const labels = steps.map((step) => step.label);
  assert.ok(labels.indexOf("product build") < labels.indexOf("TypeScript"));
});

test("a script change also runs the script tests", () => {
  const steps = planSteps({ base, paths: ["scripts/ci-plan.mjs"], routeTreeCurrent: true });
  const last = steps.at(-1);
  assert.equal(last.command, "node");
  assert.deepEqual(last.args, ["--test", "scripts/*.test.mjs"]);
});

test("no change plans no steps", () => {
  assert.deepEqual(planSteps({ base, paths: [], routeTreeCurrent: true }), []);
});

test("changed paths join committed and untracked files against the merge base", () => {
  const calls = [];
  const git = (args) => {
    calls.push(args.join(" "));
    if (args[0] === "merge-base") return `${base}\n`;
    if (args[0] === "diff") return "a.ts\nb.ts\n";
    return "b.ts\nc.ts\n";
  };

  assert.deepEqual(changedPaths(git), { base, paths: ["a.ts", "b.ts", "c.ts"] });
  assert.equal(calls[0], "merge-base origin/main HEAD");
  assert.equal(calls[1], `diff --name-only ${base}`);
});

test("a server change also runs the Workers-runtime tests", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/src/server/cimd-fetch.ts"],
    routeTreeCurrent: true,
  });
  assert.deepEqual(steps.at(-1).args, ["--filter", "@lymi/web", "test:workers"]);
});

test("a route added or removed since the route tree was built makes it stale", () => {
  const root = mkdtempSync(join(tmpdir(), "route-tree-"));
  const tree = join(root, "routeTree.gen.ts");
  const dir = join(root, "routes");
  mkdirSync(join(dir, "_app"), { recursive: true });
  for (const file of ["__root.tsx", "_app/today.tsx", "-shared.tsx", "today.browser.test.tsx"])
    writeFileSync(join(dir, file), "");
  assert.equal(routeTreeIsCurrent(tree, dir), false);

  writeFileSync(
    tree,
    "import { Route as rootRouteImport } from './routes/__root'\nimport { Route as AppTodayRouteImport } from './routes/_app/today'\n",
  );
  assert.equal(routeTreeIsCurrent(tree, dir), true);

  writeFileSync(join(dir, "_app", "emails.tsx"), "");
  assert.equal(routeTreeIsCurrent(tree, dir), false);

  rmSync(join(dir, "_app", "emails.tsx"));
  rmSync(join(dir, "_app", "today.tsx"));
  assert.equal(routeTreeIsCurrent(tree, dir), false);
});
