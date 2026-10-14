export type OriginBadge = "ukraine" | "estonia";

/**
 * Which origin the site names to this visitor, read from the browser alone so no address is looked
 * up. Language outranks time zone, so a Ukrainian speaker living in Tallinn sees Ukraine, and the
 * Russian pages never name Ukraine.
 * BaseLayout inlines this function's source to run before first paint, so it closes over nothing.
 */
export function originBadge(
  timeZone: string | undefined,
  languages: readonly string[],
  pageLocale: string,
): OriginBadge | null {
  if (pageLocale === "uk") return "ukraine";
  const ukraine = pageLocale !== "ru";
  for (const tag of languages) {
    const [language, ...rest] = tag.toLowerCase().split("-");
    if (ukraine && (language === "uk" || rest.includes("ua"))) return "ukraine";
    if (language === "et" || rest.includes("ee")) return "estonia";
  }
  // Zone names, not offsets: Helsinki, Riga and Vilnius share Tallinn's clock but not its name.
  if (timeZone === "Europe/Tallinn") return "estonia";
  const kyiv = ["Europe/Kyiv", "Europe/Kiev", "Europe/Uzhgorod", "Europe/Zaporozhye"];
  return ukraine && timeZone && kyiv.includes(timeZone) ? "ukraine" : null;
}

/** Sets `data-origin` on the document before first paint; the hero's badge shows from it. */
export function originScript(pageLocale: string): string {
  return `try{var o=(${originBadge.toString()})(Intl.DateTimeFormat().resolvedOptions().timeZone,navigator.languages||[],${JSON.stringify(pageLocale)});if(o)document.documentElement.dataset.origin=o}catch(e){}`;
}

export function shownOriginBadge(): OriginBadge | null {
  const origin = document.documentElement.dataset.origin;
  return origin === "ukraine" || origin === "estonia" ? origin : null;
}
