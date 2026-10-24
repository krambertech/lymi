/** The R2 bucket the release job uploads to; `forge.config.js` writes each build's feed against it. */
export const DOWNLOADS = "https://downloads.lymi.app";

/** The update feed for this build's chip, or null where the app has no updates. */
export function updateFeed(platform: string, arch: string) {
  if (platform !== "darwin" || (arch !== "arm64" && arch !== "x64")) return null;
  return `${DOWNLOADS}/darwin/${arch}/RELEASES.json`;
}
