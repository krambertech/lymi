import assert from "node:assert/strict";
import test from "node:test";
import { requiresSitePreview } from "./site-preview-impact.mjs";

test("requires a preview for the public site and its build inputs", () => {
  assert.equal(requiresSitePreview(["apps/site/src/pages/index.astro"]), true);
  assert.equal(requiresSitePreview(["apps/web/migrations/0010_example.sql"]), true);
  assert.equal(requiresSitePreview(["packages/core/src/index.ts"]), true);
  assert.equal(requiresSitePreview(["scripts/check-deployment.mjs"]), true);
  assert.equal(requiresSitePreview(["pnpm-lock.yaml"]), true);
  assert.equal(requiresSitePreview([".github/workflows/ci.yml"]), true);
});

test("skips product-only, documentation, and agent-only changes", () => {
  assert.equal(requiresSitePreview(["apps/web/src/client/routes/today.tsx"]), false);
  assert.equal(requiresSitePreview(["apps/web/src/client/design/DesignPage.tsx"]), false);
  assert.equal(requiresSitePreview(["DESIGN.md"]), false);
  assert.equal(requiresSitePreview(["docs/plans/example.md"]), false);
  assert.equal(requiresSitePreview([".agents/skills/example/SKILL.md"]), false);
});

test("requires a preview when a pull request mixes site and unrelated changes", () => {
  assert.equal(
    requiresSitePreview(["docs/README.md", "apps/site/src/components/BetaSignup.tsx"]),
    true,
  );
});
