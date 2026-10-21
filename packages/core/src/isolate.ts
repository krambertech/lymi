const FSI = "⁨";
const PDI = "⁩";

/** A letter of a right-to-left script: Hebrew, Arabic, Syriac, Thaana, N'Ko and their presentation forms. */
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-ﻼ\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u;

/**
 * Learner text set inside interface text, wrapped in a first-strong isolate, so an Arabic term
 * never reorders the English sentence around it. Text with no right-to-left letter is left as it
 * is, since the interface runs left to right. For display only: never store, export or speak it.
 */
export function isolate(text: string | null | undefined): string {
  if (!text) return "";
  if (!RTL_LETTER.test(text) || (text.startsWith(FSI) && text.endsWith(PDI))) return text;
  return `${FSI}${text}${PDI}`;
}

/** Text without the isolates `isolate` added, for an accessible name, which draws nothing. */
export function unisolate<T extends string | null | undefined>(text: T): T {
  return (text ? text.replace(/[⁨⁩]/g, "") : text) as T;
}
