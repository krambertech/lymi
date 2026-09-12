import type { z } from "zod";

/**
 * One message per field, from the same Zod schema the server parses with. The interface and
 * the API therefore cannot disagree about what is valid, or about how to say so.
 */
export type FieldErrors = Record<string, string>;

/**
 * `messages` carries the sentence to show per field, written in the component so it is in
 * the learner's language. The schema still decides what is valid; a field without a message
 * falls back to the schema's English.
 */
export function fieldErrors(error: z.ZodError, messages: FieldErrors = {}): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    // The first issue on a field is the one to fix; the rest usually follow from it.
    if (key && !(key in out)) out[key] = messages[key] ?? issue.message;
  }
  return out;
}

/**
 * Put the caret on the first thing that is wrong. A submit that only paints the form red
 * leaves a screen reader where it was, and on a phone the bad field may be off screen.
 */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  });
}
