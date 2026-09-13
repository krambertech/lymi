const sitePreviewPrefixes = ["apps/site/", "apps/web/migrations/", "packages/core/", "scripts/"];

const sitePreviewFiles = new Set([
  ".github/workflows/ci.yml",
  ".nvmrc",
  "biome.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
]);

export function requiresSitePreview(paths) {
  return paths.some(
    (path) =>
      sitePreviewFiles.has(path) || sitePreviewPrefixes.some((prefix) => path.startsWith(prefix)),
  );
}
