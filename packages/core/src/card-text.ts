import { sameTamilReading } from "./indic";
import { jyutpingDigits } from "./jyutping";
import { type ReadingEngine, readingEngine, stressRules } from "./languages";
import { toneMarks } from "./pinyin";
import { storedPitch } from "./pitch";
import { foldReading, splitTermReading, withoutPitch } from "./reading";
import { cyrillicStress, hasStress, readStress, stressKey, stripStress } from "./stress";

export type NormalizedField = "term" | "pronunciation";

export type CardText = {
  term?: string | undefined;
  pronunciation?: string | null | undefined;
};

const CONVERT: Record<ReadingEngine, (text: CardText, language: string) => CardText> = {
  furigana: japaneseReading,
  pinyin: markTones,
  jyutping: plainToneNumbers,
  stress: markStress,
  indic: dropSpelledReading,
};

function plainToneNumbers({ pronunciation }: CardText): CardText {
  return pronunciation ? { pronunciation: jyutpingDigits(pronunciation) } : {};
}

function dropSpelledReading({ term, pronunciation }: CardText): CardText {
  return term !== undefined && pronunciation && sameTamilReading(term, pronunciation)
    ? { pronunciation: null }
    : {};
}

function markStress({ term, pronunciation }: CardText, language: string): CardText {
  const rules = stressRules(language);
  if (!rules) return {};
  const sent = pronunciation?.trim() ? cyrillicStress(pronunciation, rules) : pronunciation;
  const out: CardText = sent === pronunciation ? {} : { pronunciation: sent };
  if (term === undefined) return out;
  const typed = cyrillicStress(term, rules);
  const plain = stripStress(typed);
  const read = hasStress(typed) ? readStress(plain, typed, rules) : null;
  if (read === null) return typed === term ? out : { ...out, term: typed };
  if (read.marks === 0) return { ...out, term: plain };
  if (!sent?.trim()) return { term: plain, pronunciation: read.form };
  return stressKey(plain, sent, rules) === read.form.toLowerCase() ? { ...out, term: plain } : out;
}

function markTones({ pronunciation }: CardText): CardText {
  return pronunciation ? { pronunciation: toneMarks(pronunciation) } : {};
}

function japaneseReading({ term, pronunciation }: CardText): CardText {
  const stored = pronunciation ? { pronunciation: storedPitch(pronunciation) } : {};
  const split = term === undefined ? null : splitTermReading(term);
  if (!split) return stored;
  const sent = stored.pronunciation?.trim();
  if (!sent) return { term: split.term, pronunciation: split.reading };
  return foldReading(withoutPitch(sent)) === split.reading
    ? { ...stored, term: split.term }
    : stored;
}

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
