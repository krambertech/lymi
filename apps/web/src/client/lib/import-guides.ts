import { importGuidePath } from "@lymi/client/imports";
import type { ImportSource } from "@lymi/core";
import { publicSiteUrl } from "./origins";

/** Each source's guide on the public site: how to export from that app, and what comes across. */
export function importGuideUrl(source: ImportSource): string | undefined {
  const path = importGuidePath(source);
  return path ? publicSiteUrl(path) : undefined;
}
