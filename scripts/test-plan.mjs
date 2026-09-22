// Which tests a change needs. `pnpm verify:changed` and `ci-plan.mjs` both read it, so the rule
// for skipping a browser lives in one tested place. docs/testing.md.

export const allComponentInstances = ["desktop", "touch", "touch-webkit"];

// Vitest's `--changed` follows imports. Nothing imports these, yet the tests depend on them.
const wideningPrefixes = [
  "apps/web/migrations/",
  "apps/web/src/locales/",
  "apps/web/src/test/",
  "apps/web/src/client/test/",
  "apps/web/src/client/styles/",
  "apps/site/src/locales/",
  ".github/workflows/",
];

const wideningFiles = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "biome.json",
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "apps/web/tsconfig.worker.json",
  "apps/web/vite.config.ts",
  "apps/web/wrangler.jsonc",
  "apps/web/drizzle.config.ts",
  "apps/web/src/client/styles.css",
  "apps/site/package.json",
  "apps/site/astro.config.mjs",
  "apps/site/wrangler.jsonc",
  "apps/site/src/styles.css",
  "packages/core/package.json",
  "packages/core/vitest.config.ts",
  "scripts/test-plan.mjs",
  "scripts/verify-changed.mjs",
]);

// The overlays adapt to the device, so only the primitives and their harness can break touch.
const touchPrefixes = ["apps/web/src/client/components/ui/"];

const touchFiles = new Set(["apps/web/src/client/design/forced-states.tsx"]);

export function runsEverything(paths) {
  return paths.some(
    (path) => wideningFiles.has(path) || wideningPrefixes.some((prefix) => path.startsWith(prefix)),
  );
}

export function requiresTouchInstances(paths) {
  return (
    runsEverything(paths) ||
    paths.some(
      (path) =>
        path.endsWith(".browser.test.tsx") ||
        touchFiles.has(path) ||
        touchPrefixes.some((prefix) => path.startsWith(prefix)),
    )
  );
}

export function selectComponentInstances(paths) {
  return requiresTouchInstances(paths) ? allComponentInstances : ["desktop"];
}

export function componentBrowsers(instances) {
  return instances.includes("touch-webkit") ? "chromium webkit" : "chromium";
}

export function describeComponentInstances(instances) {
  return instances.includes("touch")
    ? "desktop and touch Chromium, touch WebKit"
    : "desktop Chromium";
}
