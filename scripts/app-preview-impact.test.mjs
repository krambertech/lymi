import assert from "node:assert/strict";
import test from "node:test";
import { requiresAppPreview } from "./app-preview-impact.mjs";

test("requires a preview for the product and its build inputs", () => {
  assert.equal(requiresAppPreview(["apps/web/src/client/routes/today.tsx"]), true);
  assert.equal(requiresAppPreview(["apps/web/migrations/0010_example.sql"]), true);
  assert.equal(requiresAppPreview(["packages/core/src/index.ts"]), true);
  assert.equal(requiresAppPreview(["scripts/check-deployment.mjs"]), true);
  assert.equal(requiresAppPreview(["pnpm-lock.yaml"]), true);
  assert.equal(requiresAppPreview([".github/workflows/ci.yml"]), true);
});

test("skips site-only, documentation, design-source, and agent-only changes", () => {
  assert.equal(requiresAppPreview(["apps/site/src/pages/index.astro"]), false);
  assert.equal(requiresAppPreview(["DESIGN.md"]), false);
  assert.equal(requiresAppPreview(["docs/plans/example.md"]), false);
  assert.equal(requiresAppPreview([".agents/skills/example/SKILL.md"]), false);
});

test("requires a preview when a pull request mixes product and unrelated changes", () => {
  assert.equal(requiresAppPreview(["docs/README.md", "apps/web/src/server/index.ts"]), true);
});
