/**
 * Card text as stored: input with one possible meaning converted before any write compares or
 * records it, so a converted term still meets its duplicate and a converted Reading is never a
 * correction of the AI. docs/proposals/supported-languages.md, Writes.
 */
import { sameTamilReading } from "./indic";
import { jyutpingDigits } from "./jyutping";
import { type ReadingEngine, readingEngine, stressRules } from "./languages";
import { toneMarks } from "./pinyin";
import { foldReading, splitTermReading } from "./reading";
import {
  acuteStress,
  cyrillicStress,
  hasStress,
  readStress,
  stressKey,
  stripStress,
} from "./stress";

/** A field `normalizeCardText` may convert. */
export type NormalizedField = "term" | "pronunciation";

/** The fields a write sends; a field left out is not being written. */
export type CardText = {
  term?: string | undefined;
  pronunciation?: string | null | undefined;
};

/** Each engine's conversions, such as pinyin's tone numbers to marks; each returns only the fields it changed. */
const CONVERT: Record<ReadingEngine, (text: CardText, language: string) => CardText> = {
  furigana: splitBracketedTerm,
  pinyin: markTones,
  jyutping: plainToneNumbers,
  stress: markStress,
  indic: dropSpelledReading,
};

/** Jyutping sent with raised or full-width tone numbers stores them plain: nei⁵ hou² → nei5 hou2. */
function plainToneNumbers({ pronunciation }: CardText): CardText {
  return pronunciation ? { pronunciation: jyutpingDigits(pronunciation) } : {};
}

/**
 * A Tamil pronunciation that only repeats the reading the spelling gives is left empty, so the
 * field holds only words not said as spelled. An edit that sends no term keeps it as sent.
 */
function dropSpelledReading({ term, pronunciation }: CardText): CardText {
  return term !== undefined && pronunciation && sameTamilReading(term, pronunciation)
    ? { pronunciation: null }
    : {};
}

/**
 * Accented Latin look-alikes become Cyrillic vowels with U+0301 (замóк → замо́к), an acute where a
 * language writes no such letter becomes its mark (múzyka → mùzyka), and a stressed term splits
 * into the term as natives write it and its stress as the pronunciation, as a lesson or an import
 * marks it: за́мок → замок stressed за́мок. A pronunciation that says something else, such as IPA
 * or another stress, leaves the term as sent.
 */
function markStress({ term, pronunciation }: CardText, language: string): CardText {
  const rules = stressRules(language);
  if (!rules) return {};
  const marked = (text: string) => acuteStress(cyrillicStress(text, rules), rules);
  const sent = pronunciation?.trim() ? marked(pronunciation) : pronunciation;
  const out: CardText = sent === pronunciation ? {} : { pronunciation: sent };
  if (term === undefined) return out;
  const typed = marked(term);
  const plain = stripStress(typed, rules.mark);
  const read = hasStress(typed, rules.mark) ? readStress(plain, typed, rules) : null;
  if (read === null) return typed === term ? out : { ...out, term: typed };
  // An acute over ё or over a word of one syllable says nothing, so it only leaves the term.
  if (read.marks === 0) return { ...out, term: plain };
  if (!sent?.trim()) return { term: plain, pronunciation: read.form };
  return stressKey(plain, sent, rules) === read.form.toLowerCase() ? { ...out, term: plain } : out;
}

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
  const changed = engine && language ? CONVERT[engine](fields, language) : {};
  const normalized = (["term", "pronunciation"] as const).filter(
    (field) => changed[field] !== undefined && changed[field] !== fields[field],
  );
  return normalized.length === 0
    ? { fields, normalized }
    : { fields: { ...fields, ...changed }, normalized };
}
