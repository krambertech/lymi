const FSI = "\u2068";
const PDI = "\u2069";

/**
 * Learner text set inside interface text, wrapped in a first-strong isolate, so an Arabic term
 * never reorders the English sentence around it. For display only: never store, export or speak it.
 */
export function isolate(text: string | null | undefined): string {
  if (!text) return "";
  if (text.startsWith(FSI) && text.endsWith(PDI)) return text;
  return `${FSI}${text}${PDI}`;
}
