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
  return paths.some(
    (path) =>
      appPreviewFiles.has(path) || appPreviewPrefixes.some((prefix) => path.startsWith(prefix)),
  );
}
