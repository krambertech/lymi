import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  everyFeature,
  fallbackFeatures,
  featureReach,
  readRecipes,
  selectVerifyFeatures,
} from "./verify-impact.mjs";

const recipes = readRecipes();
const select = (...paths) => selectVerifyFeatures(paths, recipes);

test("every recipe has a row and every row has a recipe", () => {
  assert.deepEqual(Object.keys(featureReach).sort(), recipes.names);
});

test("every path in the table names a file that exists", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  }).split("\n");
  const prefixes = new Set([...everyFeature, ...Object.values(featureReach).flat()]);
  const missing = [...prefixes].filter((prefix) => !files.some((file) => file.startsWith(prefix)));
  assert.deepEqual(missing, []);
});

test("a screen reaches the features that drive it", () => {
  assert.deepEqual(select("apps/web/src/client/components/rest-day-banner.tsx").features, [
    "rest-day",
  ]);
  assert.deepEqual(select("apps/web/src/server/imports/pleco/parse.ts").features, ["import-pleco"]);
  const review = select("apps/web/src/client/views/review-view.tsx").features;
  assert.ok(review.includes("review") && review.includes("japanese"));
  assert.ok(!review.includes("import") && !review.includes("sign-in"));
});

test("a language's own module reaches only that language's features", () => {
  assert.deepEqual(select("packages/core/src/languages/ukrainian.ts").features, ["ukrainian"]);
});

test("a recipe reaches itself and the recipes that import it", () => {
  assert.deepEqual(select(".agents/skills/verify/features/review.mjs").features, ["review"]);
  assert.deepEqual(select(".agents/skills/verify/features/new-deck.mjs").features, [
    "new-deck",
    "offline-writes",
  ]);
});

test("the shell, the runner and shared configuration reach every feature", () => {
  for (const path of [
    "apps/web/src/client/components/ui/dialog.tsx",
    "apps/web/src/server/routes/dev.ts",
    ".agents/skills/verify/scripts/run.mjs",
    "pnpm-lock.yaml",
  ]) {
    assert.deepEqual(select(path).features, recipes.names, path);
  }
});

test("shared package code no row claims reaches every feature", () => {
  const { features, reason } = select("packages/core/src/notes.ts");
  assert.deepEqual(features, recipes.names);
  assert.match(reason, /packages\/core\/src\/notes\.ts/);
});

test("a product screen no row claims drives the main learner path and says so", () => {
  const { features, unclaimed, reason } = select("apps/web/src/client/views/insights-view.tsx");
  assert.deepEqual(features, fallbackFeatures.toSorted());
  assert.deepEqual(unclaimed, ["apps/web/src/client/views/insights-view.tsx"]);
  assert.match(reason, /insights-view/);
});

test("documentation, tests, other apps and recipe entries drive nothing", () => {
  const { features, reason } = select(
    "docs/testing.md",
    "apps/web/src/server/services/cards.test.ts",
    "apps/web/src/client/components/ui/button.browser.test.tsx",
    "apps/web/src/client/design/screens.tsx",
    "apps/mobile/src/app/index.tsx",
    "apps/site/src/pages/index.astro",
    ".agents/skills/verify/features/review.md",
  );
  assert.deepEqual(features, []);
  assert.match(reason, /no product path/);
});
