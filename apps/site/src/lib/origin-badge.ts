export type OriginBadge = "ukraine" | "estonia";

interface Signals {
  timeZone: string | undefined;
  languages: readonly string[];
  pageLocale: string;
}

const ZONES: Record<string, OriginBadge> = {
  "Europe/Kyiv": "ukraine",
  "Europe/Kiev": "ukraine",
  "Europe/Uzhgorod": "ukraine",
  "Europe/Zaporozhye": "ukraine",
  "Europe/Tallinn": "estonia",
};

function fromLanguage(tag: string): OriginBadge | null {
  const [language, ...rest] = tag.toLowerCase().split("-");
  if (language === "uk" || rest.includes("ua")) return "ukraine";
  if (language === "et" || rest.includes("ee")) return "estonia";
  return null;
}

/**
 * Which origin the site names to this visitor, read from the browser alone so no address is looked
 * up. Language outranks time zone, so a Ukrainian speaker living in Tallinn sees Ukraine.
 */
export function originBadge({ timeZone, languages, pageLocale }: Signals): OriginBadge | null {
  if (pageLocale === "uk") return "ukraine";
  for (const tag of languages) {
    const badge = fromLanguage(tag);
    if (badge) return badge;
  }
  return (timeZone && ZONES[timeZone]) || null;
}

export function visitorOriginBadge(pageLocale: string): OriginBadge | null {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  return originBadge({ timeZone, languages: navigator.languages ?? [], pageLocale });
}
