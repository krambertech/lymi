import { isTestFile } from "./e2e-impact.mjs";

const appPreviewPrefixes = [
  "apps/web/",
  "packages/client/",
  "packages/core/",
  "packages/design/",
  "scripts/",
  // CI drives the verify recipes on the preview, so a recipe change needs one to prove itself.
  ".agents/skills/verify/scripts/",
];

const appPreviewFiles = new Set([
  ".github/workflows/ci.yml",
  ".github/workflows/app-preview-cleanup.yml",
  ".nvmrc",
  "biome.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
]);

export function requiresAppPreview(paths) {
  return paths.some((path) => {
    if (appPreviewFiles.has(path)) return true;
    if (isTestFile(path)) return false;
    if (path.startsWith(".agents/skills/verify/features/")) return path.endsWith(".mjs");
    return appPreviewPrefixes.some((prefix) => path.startsWith(prefix));
  });
}
