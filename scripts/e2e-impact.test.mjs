import assert from "node:assert/strict";
import test from "node:test";
import { requiresE2E } from "./e2e-impact.mjs";

test("requires E2E for production behavior and harness changes", () => {
  assert.equal(requiresE2E(["apps/web/src/client/routes/today.tsx"]), true);
  assert.equal(requiresE2E(["apps/web/src/server/routes/cards.ts"]), true);
  assert.equal(requiresE2E(["apps/site/src/pages/index.astro"]), true);
  assert.equal(requiresE2E(["packages/core/src/fsrs.ts"]), true);
  assert.equal(requiresE2E(["playwright.config.ts"]), true);
  assert.equal(requiresE2E(["scripts/ci-plan.mjs"]), true);
  assert.equal(requiresE2E(["scripts/check-deployment.mjs"]), true);
  assert.equal(requiresE2E(["scripts/check-migrations.mjs"]), true);
  assert.equal(requiresE2E(["scripts/check-schema-drift.mjs"]), true);
  assert.equal(requiresE2E(["apps/web/src/client/design/specimens.tsx"]), true);
  assert.equal(requiresE2E(["apps/web/src/client/routes/design_.frame.$specimen.tsx"]), true);
});

test("skips E2E for documentation, previews, and unit-test-only changes", () => {
  assert.equal(requiresE2E(["docs/proposals/shared-decks.md"]), false);
  assert.equal(requiresE2E(["apps/web/src/client/design/screens.tsx"]), false);
  assert.equal(requiresE2E(["apps/web/src/server/services/cards.test.ts"]), false);
});

test("runs E2E when a PR mixes documentation with production code", () => {
  assert.equal(
    requiresE2E(["README.md", "apps/web/src/client/components/add-card-sheet.tsx"]),
    true,
  );
});
