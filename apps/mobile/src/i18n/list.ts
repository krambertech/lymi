// Hermes does not ship Intl.ListFormat, so a plain comma list stands in for it.
export function formatList(items: string[], locale: string): string {
  return typeof Intl.ListFormat === "function"
    ? new Intl.ListFormat(locale, { type: "conjunction", style: "narrow" }).format(items)
    : items.join(", ");
}
