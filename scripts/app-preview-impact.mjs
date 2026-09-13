import { isTestFile } from "./e2e-impact.mjs";

const appPreviewPrefixes = ["apps/web/", "packages/core/", "scripts/"];

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
    return appPreviewPrefixes.some((prefix) => path.startsWith(prefix));
  });
}
