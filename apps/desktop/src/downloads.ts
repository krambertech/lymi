export const DOWNLOADS = "https://downloads.lymi.app";

export function updateFeed(platform: string, arch: string) {
  if (platform !== "darwin" || (arch !== "arm64" && arch !== "x64")) return null;
  return `${DOWNLOADS}/darwin/${arch}/RELEASES.json`;
}
