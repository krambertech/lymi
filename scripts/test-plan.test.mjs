import assert from "node:assert/strict";
import test from "node:test";
import {
  allComponentInstances,
  componentBrowsers,
  describeComponentInstances,
  requiresTouchInstances,
  runsEverything,
  selectComponentInstances,
} from "./test-plan.mjs";

test("a screen, a service or core logic needs desktop Chromium only", () => {
  const paths = [
    "apps/web/src/client/routes/today.tsx",
    "apps/web/src/server/services/decks.ts",
    "packages/core/src/fsrs.ts",
    "docs/testing.md",
  ];

  assert.equal(runsEverything(paths), false);
  assert.equal(requiresTouchInstances(paths), false);
  assert.deepEqual(selectComponentInstances(paths), ["desktop"]);
  assert.equal(componentBrowsers(["desktop"]), "chromium");
  assert.equal(describeComponentInstances(["desktop"]), "desktop Chromium");
});

test("the UI primitives, their tests and the specimen harness need every instance", () => {
  for (const path of [
    "apps/web/src/client/components/ui/dialog.tsx",
    "apps/web/src/client/components/streak.browser.test.tsx",
    "apps/web/src/client/design/forced-states.tsx",
  ]) {
    assert.equal(runsEverything([path]), false, path);
    assert.deepEqual(selectComponentInstances([path]), allComponentInstances, path);
  }

  assert.equal(componentBrowsers(allComponentInstances), "chromium webkit");
  assert.equal(
    describeComponentInstances(allComponentInstances),
    "desktop and touch Chromium, touch WebKit",
  );
});

test("files the tests depend on without importing widen the run to everything", () => {
  for (const path of [
    "apps/web/migrations/0031_members.sql",
    "apps/web/src/locales/uk.po",
    "apps/web/src/client/styles.css",
    "apps/web/src/client/styles/lantern.css",
    "apps/web/src/client/test/browser-setup.ts",
    "apps/web/vite.config.ts",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "scripts/test-plan.mjs",
  ]) {
    assert.equal(runsEverything([path]), true, path);
    assert.deepEqual(selectComponentInstances([path]), allComponentInstances, path);
  }
});

test("no changes need no browsers beyond desktop", () => {
  assert.equal(runsEverything([]), false);
  assert.deepEqual(selectComponentInstances([]), ["desktop"]);
});
