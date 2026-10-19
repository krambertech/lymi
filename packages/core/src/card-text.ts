/**
 * Card text as stored: input with one possible meaning converted before any write compares or
 * records it, so a converted term still meets its duplicate and a converted Reading is never a
 * correction of the AI. docs/proposals/supported-languages.md, Writes.
 */
import { type ReadingEngine, readingEngine } from "./languages";
import { toneMarks } from "./pinyin";
import { foldReading, splitTermReading } from "./reading";

/** A field `normalizeCardText` may convert. */
export type NormalizedField = "term" | "pronunciation";

/** The fields a write sends; a field left out is not being written. */
export type CardText = {
  term?: string | undefined;
  pronunciation?: string | null | undefined;
};

/** Each engine's conversions, such as pinyin's tone numbers to marks; each returns only the fields it changed. */
const CONVERT: Record<ReadingEngine, (text: CardText) => CardText> = {
  furigana: splitBracketedTerm,
  pinyin: markTones,
};

/** Pinyin sent with tone numbers stores with tone marks: ni3 hao3 → nǐ hǎo. */
function markTones({ pronunciation }: CardText): CardText {
  return pronunciation ? { pronunciation: toneMarks(pronunciation) } : {};
}

/**
 * `食[た]べる` sent as the term splits into 食べる and its Reading たべる, unless the card was sent a
 * different pronunciation, which leaves both as written.
 */
function splitBracketedTerm({ term, pronunciation }: CardText): CardText {
  const split = term === undefined ? null : splitTermReading(term);
  if (!split) return {};
  const sent = pronunciation?.trim();
  if (!sent) return { term: split.term, pronunciation: split.reading };
  return foldReading(sent) === split.reading ? { term: split.term } : {};
}

/**
 * The fields as Lymi stores them in this language, and which of them changed. Only input with one
 * possible meaning converts; a card is never refused for its format.
 */
export function normalizeCardText<T extends CardText>(
  language: string | null | undefined,
  fields: T,
): { fields: T; normalized: NormalizedField[] } {
  const engine = readingEngine(language);
  const changed = engine ? CONVERT[engine](fields) : {};
  const normalized = (["term", "pronunciation"] as const).filter(
    (field) => changed[field] !== undefined && changed[field] !== fields[field],
  );
  return normalized.length === 0
    ? { fields, normalized }
    : { fields: { ...fields, ...changed }, normalized };
}
