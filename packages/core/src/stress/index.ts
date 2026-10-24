/**
 * The marks-in-place engine: the term stays as natives write it, and the pronunciation is the
 * term with U+0301 over each stressed vowel, drawn in place of the term until the card is Known.
 * docs/proposals/russian-and-ukrainian.md.
 */
import type { StressRules } from "../languages/types";

/** The combining acute that marks a stressed vowel. */
export const STRESS = "́";

/** One base character and the combining marks after it, in NFD, so й stays и with its breve. */
const UNIT = /\P{M}\p{M}*/gu;

const units = (text: string) => text.normalize("NFD").match(UNIT) ?? [];

const clean = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");

/**
 * Text with its stress marks taken out and every other mark kept, so ё, й and Lithuanian ą́'s
 * ogonek survive: removing all of `\p{M}` after NFD would turn й into и.
 */
export function stripStress(text: string): string {
  return text.normalize("NFD").replaceAll(STRESS, "").normalize("NFC");
}

/** Whether text carries a stress mark. */
export function hasStress(text: string): boolean {
  return text.normalize("NFD").includes(STRESS);
}

/** One character of the term as drawn: its letter, and whether it restores ё or takes an acute. */
type Drawn = { text: string; vowel: boolean; restored: boolean; acute: boolean };

/**
 * The term with the pronunciation's marks drawn in place, in the term's own letters and case, or
 * null unless the pronunciation is the term with marks added and adds at least one. A mark is an
 * acute over a vowel, or ё restored where the term writes е. ё is always stressed and a word of one
 * syllable has nothing to tell apart, so an acute over either is dropped. So замок read за́мок
 * draws за́мок, ежик read ёжик draws ёжик, and an IPA line, another word, or a mark over a
 * consonant draws nothing.
 */
export function markedForm(term: string, pronunciation: string, rules: StressRules): string | null {
  const read = readStress(term, pronunciation, rules);
  return read && read.marks > 0 ? read.form : null;
}

/**
 * The term as `markedForm` draws it and how many marks it carries, or null when the pronunciation
 * is not the term with marks added, so a caller can tell marks that say nothing from wrong ones.
 */
export function readStress(
  term: string,
  pronunciation: string,
  rules: StressRules,
): { form: string; marks: number } | null {
  const plain = units(clean(term));
  const marked = units(clean(pronunciation));
  if (plain.length === 0 || plain.length !== marked.length) return null;
  const drawn: Drawn[] = [];
  for (const [i, unit] of plain.entries()) {
    const lower = apostrophe(unit.toLowerCase().normalize("NFC"));
    const read = apostrophe((marked[i] as string).toLowerCase());
    const acute = read.includes(STRESS) && !lower.includes(STRESS);
    const letter = (acute ? read.replace(STRESS, "") : read).normalize("NFC");
    const restored = letter !== lower;
    if (restored && rules.restores?.[letter] !== lower) return null;
    const vowel = rules.vowels.includes(letter);
    if (acute && !vowel) return null;
    const text = !restored ? unit : unit.normalize("NFC") === lower ? letter : letter.toUpperCase();
    drawn.push({ text, vowel, restored, acute: acute && !rules.restores?.[letter] });
  }
  let marks = 0;
  let out = "";
  for (const word of words(drawn)) {
    const syllables = word.filter((char) => char.vowel).length;
    for (const char of word) {
      const acute = char.acute && syllables > 1;
      if (acute || char.restored) marks += 1;
      out += acute ? char.text + STRESS : char.text;
    }
  }
  return { form: out.normalize("NFC"), marks };
}

/** A hyphen or apostrophe between letters joins one word, so что́-то and об'є́кт count their syllables across it. */
const JOINER = /^[-\u2010\u2011'\u2018\u2019\u02BC`]$/u;

const APOSTROPHES = /[\u2018\u2019\u02BC`]/gu;

/** Ukrainian's apostrophes as one, so a term written м’ясо takes the pronunciation м'я́со. */
export function foldApostrophes(text: string): string {
  return text.replace(APOSTROPHES, "'");
}

const apostrophe = foldApostrophes;

/**
 * The characters split at each one that is not a letter, which stands as a word of its own. A
 * hyphen or apostrophe with letters on both sides stays inside its word.
 */
function words(chars: readonly Drawn[]): Drawn[][] {
  const out: Drawn[][] = [[]];
  for (const [i, char] of chars.entries()) {
    const letter = (at: number) => /^\p{L}/u.test(chars[at]?.text ?? "");
    const joins = JOINER.test(char.text) && letter(i - 1) && letter(i + 1);
    if (letter(i) || joins) (out.at(-1) as Drawn[]).push(char);
    else out.push([char], []);
  }
  return out;
}

/** One Cyrillic word of a sentence and the stress it carries. */
export interface WordStress {
  word: string;
  syllables: number;
  /** Acutes over a vowel. */
  acutes: number;
  /** It writes a letter whose dots mark its stress, as Russian ё does. */
  dotted: boolean;
  /** An acute stands over such a letter. */
  acuteOnDotted: boolean;
}

/** A word, with a hyphen or apostrophe between letters keeping it one word, as `words` does for the term. */
const WORD = /[\p{L}\p{M}]+(?:[-\u2010\u2011'\u2018\u2019`][\p{L}\p{M}]+)*/gu;

/** Each Cyrillic word of a sentence with its syllables and marks, so a check can say which word lacks its stress. */
export function wordStress(text: string, rules: StressRules): WordStress[] {
  return (text.normalize("NFC").match(WORD) ?? []).flatMap((word) => {
    if (!/\p{Script=Cyrillic}/u.test(word)) return [];
    const out: WordStress = { word, syllables: 0, acutes: 0, dotted: false, acuteOnDotted: false };
    for (const unit of units(word)) {
      const letter = stripStress(unit).toLowerCase();
      const acute = unit.includes(STRESS);
      const dotted = rules.restores?.[letter] !== undefined;
      if (rules.vowels.includes(letter)) out.syllables += 1;
      if (acute) out.acutes += 1;
      if (dotted) out.dotted = true;
      if (acute && dotted) out.acuteOnDotted = true;
    }
    return [out];
  });
}

/** Whether a word of two or more syllables in the text has no stress shown, by an acute or by ё. */
export function missingStress(text: string, rules: StressRules): boolean {
  return wordStress(text, rules).some(
    (word) => word.syllables > 1 && word.acutes === 0 && !word.dotted,
  );
}

/** Whether `after` is `before` with stress marks added, keeping every mark it had and changing nothing else. */
export function addsStress(before: string, after: string): boolean {
  if (stripStress(after) !== stripStress(before)) return false;
  const had = units(before);
  const has = units(after);
  if (had.length !== has.length) return false;
  let added = false;
  for (const [i, unit] of had.entries()) {
    const marked = (has[i] as string).includes(STRESS);
    if (unit.includes(STRESS) && !marked) return false;
    if (marked && !unit.includes(STRESS)) added = true;
  }
  return added;
}

/**
 * The reading the duplicate rule compares: the marked form in lower case, or null when the
 * pronunciation is not the term with a mark, so за́мок and замо́к are two words while an unmarked
 * pronunciation, IPA or another word's stress never splits one.
 */
export function stressKey(term: string, pronunciation: string, rules: StressRules): string | null {
  const marked = markedForm(term, pronunciation, rules);
  return marked === null ? null : apostrophe(marked.toLowerCase());
}

/** Accented Latin letters that look like a Cyrillic vowel, as a keyboard without Cyrillic marks types them. */
const LOOK_ALIKES: Readonly<Record<string, string>> = {
  a: "а",
  e: "е",
  o: "о",
  y: "у",
  i: "і",
  A: "А",
  E: "Е",
  O: "О",
  Y: "У",
  I: "І",
};

/**
 * Text with each accented Latin look-alike inside a Cyrillic word written as the Cyrillic vowel and
 * U+0301, so замóк typed with a Latin ó becomes замо́к. A word with no Cyrillic letter is left alone.
 */
export function cyrillicStress(text: string, rules: StressRules): string {
  if (!/\p{Script=Cyrillic}/u.test(text)) return text;
  const decomposed = text.normalize("NFD");
  const out = decomposed.replace(/[\p{L}\p{M}]+/gu, (word) =>
    /\p{Script=Cyrillic}/u.test(word)
      ? word.replace(/([aeoyiAEOYI])́/g, (found, latin: string) => {
          const cyrillic = LOOK_ALIKES[latin] as string;
          return rules.vowels.includes(cyrillic.toLowerCase()) ? cyrillic + STRESS : found;
        })
      : word,
  );
  return out === decomposed ? text : out.normalize("NFC");
}
