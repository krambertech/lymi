import assert from "node:assert/strict";
import test from "node:test";
import { changedPaths, planSteps } from "./verify-changed.mjs";

const base = "abc123";

test("a screen change runs static checks and the changed tests on desktop Chromium", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/src/client/routes/today.tsx"],
    hasRouteTree: true,
  });

  assert.deepEqual(
    steps.map((step) => step.args.join(" ")),
    [
      "check",
      "i18n:check",
      "check:migrations",
      "typecheck",
      `--filter @lymi/core exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/web exec vitest run --changed ${base} --passWithNoTests`,
      `--filter @lymi/site exec vitest run --changed ${base} --passWithNoTests`,
    ],
  );
  const web = steps.find((step) => step.args.includes("@lymi/web"));
  assert.deepEqual(web.env, { LYMI_COMPONENT_INSTANCES: "desktop" });
});

test("a primitive change keeps every component instance", () => {
  const steps = planSteps({
    base,
    paths: ["apps/web/src/client/components/ui/dialog.tsx"],
    hasRouteTree: true,
  });
  const web = steps.find((step) => step.args.includes("@lymi/web"));
  assert.deepEqual(web.env, { LYMI_COMPONENT_INSTANCES: "desktop,touch,touch-webkit" });
});

test("configuration the tests depend on hands over to the full gate", () => {
  const steps = planSteps({ base, paths: ["apps/web/migrations/0031_x.sql"], hasRouteTree: true });
  assert.deepEqual(
    steps.map((step) => step.args),
    [["verify"]],
  );
});

test("a fresh clone builds the product before typechecking", () => {
  const steps = planSteps({ base, paths: ["packages/core/src/fsrs.ts"], hasRouteTree: false });
  const labels = steps.map((step) => step.label);
  assert.ok(labels.indexOf("product build") < labels.indexOf("TypeScript"));
});

test("a script change also runs the script tests", () => {
  const steps = planSteps({ base, paths: ["scripts/ci-plan.mjs"], hasRouteTree: true });
  const last = steps.at(-1);
  assert.equal(last.command, "node");
  assert.deepEqual(last.args, ["--test", "scripts/*.test.mjs"]);
});

test("no change plans no steps", () => {
  assert.deepEqual(planSteps({ base, paths: [], hasRouteTree: true }), []);
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
