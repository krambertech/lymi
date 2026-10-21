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

/** Text without the isolates `isolate` added, for an accessible name, which draws nothing. */
export function unisolate<T extends string | null | undefined>(text: T): T {
  return (text ? text.replace(/[\u2068\u2069]/g, "") : text) as T;
}
