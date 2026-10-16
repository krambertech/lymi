import type { ImportSource } from "@lymi/core";
import { publicSiteUrl } from "./origins";

/** Each source's guide on the public site: how to export from that app, and what comes across. */
/** Quizlet has no guide yet; its views hide the link until the docs page ships. */
export function importGuideUrl(source: ImportSource): string | undefined {
  if (source === "lymi") return publicSiteUrl("/docs/export");
  if (source === "quizlet") return undefined;
  if (source === "noji") return publicSiteUrl("/docs/import-from-noji");
  return publicSiteUrl(source === "mochi" ? "/docs/import-from-mochi" : "/docs/import-from-anki");
}
