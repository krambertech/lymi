import { EXAMPLE_LENGTH, fitsExample } from "@lymi/core";

/** Scripts written without spaces, where a word can start after any letter. */
const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/** Whether a match starts a word, so a stem never matches the middle of another word. */
function wordStart(text: string, at: number, needle: string): boolean {
  if (at === 0) return true;
  const before = String.fromCodePoint(text.codePointAt(at - 1) ?? 32);
  return !/[\p{L}\p{M}\p{N}]/u.test(before) || UNSPACED.test(before) || UNSPACED.test(needle);
}

/** Where the term sits in the sentence: as written, by its first form, or by a word's stem. */
export function findTerm(sentence: string, term: string): { start: number; end: number } | null {
  const text = sentence.toLowerCase();
  const tries = [term, term.split(" · ")[0] ?? ""]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
  for (const word of (term.split(" · ")[0] ?? "").toLowerCase().split(/\s+/)) {
    // A stem finds an inflected form, as "käisime" for "käima".
    const chars = [...word];
    if (chars.length >= 4) tries.push(chars.slice(0, Math.max(3, chars.length - 2)).join(""));
  }
  for (const needle of tries) {
    for (let start = text.indexOf(needle); start >= 0; start = text.indexOf(needle, start + 1)) {
      if (wordStart(text, start, needle)) return { start, end: start + needle.length };
    }
  }
  return null;
}

/**
 * The sentence as an example, quoted as the source writes it. One longer than an example may be is
 * cut at word breaks around the term, with an ellipsis at each cut end, so the term stays in it.
 */
export function quoteAround(sentence: string, term: string): string {
  const text = sentence.replace(/\s+/g, " ").trim();
  if (fitsExample(text)) return text;
  const chars = [...text];
  const found = findTerm(text, term);
  // Positions in code points, so a cut never splits a character.
  const at = found
    ? {
        start: [...text.slice(0, found.start)].length,
        end: [...text.slice(0, found.end)].length,
      }
    : { start: 0, end: 0 };
  const room = EXAMPLE_LENGTH - 2;
  const middle = Math.floor((at.start + at.end) / 2);
  let end = Math.min(chars.length, Math.max(room, middle + Math.ceil(room / 2)));
  let start = Math.max(0, end - room);
  end = Math.min(chars.length, start + room);
  // Back to whole words, never past the term.
  if (start > 0) {
    const space = chars.indexOf(" ", start);
    if (space >= 0 && space < at.start) start = space + 1;
  }
  if (end < chars.length) {
    const space = chars.lastIndexOf(" ", end);
    if (space > start && space >= at.end) end = space;
  }
  const quote = chars.slice(start, end).join("").trim();
  return `${start > 0 ? "…" : ""}${quote}${end < chars.length ? "…" : ""}`;
}
