import { CARD_LIMITS } from "@lymi/core";
import type { ReadwiseHighlight } from "./api";

/** What one highlight gives: a card's term and example, or nothing until passages are read. */
export type HighlightTerm =
  | { kind: "term"; term: string; example: string | null; notes: string | null }
  | { kind: "passage" };

const MAX_WORDS = 4;
const MAX_LETTERS = 48;
// Scripts written without spaces between words are measured in characters instead.
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const MAX_UNSPACED = 12;
const EDGES = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;
const INLINE_TAG = /(^|\s)\.[\p{L}\p{N}_-]+/gu;
const SENTENCE_END = /(?<=[.!?…。！？])\s+/u;

/** Readwise turns a note's `.tag` words into tags; whatever else the note says stays. */
export function noteText(note: string | null | undefined): string {
  return (note ?? "").replace(INLINE_TAG, " ").replace(/\s+/g, " ").trim();
}

function asTerm(text: string): string | null {
  const term = text.replace(EDGES, "").replace(/\s+/g, " ");
  if (!term) return null;
  if (UNSPACED.test(term)) return term.length <= MAX_UNSPACED ? term : null;
  if (term.length > MAX_LETTERS || term.split(" ").length > MAX_WORDS) return null;
  return term;
}

/** The passage's sentence that holds the term, so a card's example stays one sentence. */
function sentenceWith(passage: string, term: string): string | null {
  const needle = term.toLocaleLowerCase();
  const sentence = passage
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .find((s) => s.toLocaleLowerCase().includes(needle));
  if (!sentence || sentence.length > CARD_LIMITS.example) return null;
  return sentence.replace(EDGES, "") === term ? null : sentence;
}

/**
 * A note that names a word chooses the term; otherwise a highlight of a few words is the term as
 * written. A longer passage waits for Smart add's reader, which this slice does not call yet.
 */
export function termOf(highlight: Pick<ReadwiseHighlight, "text" | "note">): HighlightTerm {
  const text = highlight.text.trim();
  const note = noteText(highlight.note);
  const named = note ? asTerm(note) : null;
  if (named) {
    return { kind: "term", term: named, example: sentenceWith(text, named), notes: null };
  }
  const term = asTerm(text);
  if (!term) return { kind: "passage" };
  return { kind: "term", term, example: null, notes: note || null };
}
