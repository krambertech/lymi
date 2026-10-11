const names = new Map<string, Intl.DisplayNames | null>();

/** A language's name in the learner's locale, or its tag where the runtime cannot name it. */
export function languageName(tag: string, locale = "en"): string {
  if (!names.has(locale)) {
    try {
      names.set(locale, new Intl.DisplayNames([locale], { type: "language" }));
    } catch {
      names.set(locale, null);
    }
  }
  try {
    return names.get(locale)?.of(tag) ?? tag;
  } catch {
    return tag;
  }
}
