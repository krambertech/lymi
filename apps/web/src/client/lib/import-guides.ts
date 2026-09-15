import type { ImportSource } from "@lymi/core";
import { publicSiteUrl } from "./origins";

/** Each source's guide on the public site: how to export from that app, and what comes across. */
export function importGuideUrl(source: ImportSource) {
  if (source === "lymi") return publicSiteUrl("/docs/export");
  return publicSiteUrl(source === "mochi" ? "/docs/import-from-mochi" : "/docs/import-from-anki");
}
