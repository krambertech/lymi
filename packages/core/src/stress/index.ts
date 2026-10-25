/**
 * The marks-in-place engine: the term stays as natives write it, and the pronunciation is the
 * term with a mark, U+0301 unless the language's rules name another, over each stressed vowel,
 * drawn in place of the term until the card is Known. docs/proposals/russian-and-ukrainian.md.
 */
import type { StressRules } from "../languages/types";

/** The combining acute that marks a stressed vowel. */
export const STRESS = "́";

/** The mark a language's rules put over a stressed vowel. */
const markOf = (rules: StressRules) => rules.mark ?? STRESS;

/** One base character and the combining marks after it, in NFD, so й stays и with its breve. */
const UNIT = /\P{M}\p{M}*/gu;

const units = (text: string) => text.normalize("NFD").match(UNIT) ?? [];

const clean = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");

/**
 * Text with its stress marks taken out and every other mark kept, so ё, й and Lithuanian ą́'s
 * ogonek survive: removing all of `\p{M}` after NFD would turn й into и.
 */
export function stripStress(text: string, mark = STRESS): string {
  return text.normalize("NFD").replaceAll(mark, "").normalize("NFC");
}

/** Whether text carries a stress mark. */
export function hasStress(text: string, mark = STRESS): boolean {
  return text.normalize("NFD").includes(mark);
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
  const mark = markOf(rules);
  const plain = units(clean(term));
  const marked = units(clean(pronunciation));
  if (plain.length === 0 || plain.length !== marked.length) return null;
  const drawn: Drawn[] = [];
  for (const [i, unit] of plain.entries()) {
    const lower = apostrophe(unit.toLowerCase().normalize("NFC"));
    const read = apostrophe((marked[i] as string).toLowerCase());
    const acute = read.includes(mark) && !lower.includes(mark);
    const letter = (acute ? read.replace(mark, "") : read).normalize("NFC");
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
      out += acute ? char.text + mark : char.text;
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

/** One word of a sentence in the language's letters and the stress it carries. */
export interface WordStress {
  word: string;
  syllables: number;
  /** Stress marks over a vowel. */
  acutes: number;
  /** It writes a letter whose dots mark its stress, as Russian ё does. */
  dotted: boolean;
  /** An acute stands over such a letter. */
  acuteOnDotted: boolean;
}

/** A word, with a hyphen or apostrophe between letters keeping it one word, as `words` does for the term. */
const WORD = /[\p{L}\p{M}]+(?:[-\u2010\u2011'\u2018\u2019`][\p{L}\p{M}]+)*/gu;

/**
 * Each word of a sentence with a vowel of the language, with its syllables and marks, so a check
 * can say which word lacks its stress and a Latin word in a Cyrillic sentence is left out.
 */
export function wordStress(text: string, rules: StressRules): WordStress[] {
  const mark = markOf(rules);
  return (text.normalize("NFC").match(WORD) ?? []).flatMap((word) => {
    const vowel = (unit: string) => rules.vowels.includes(stripStress(unit, mark).toLowerCase());
    if (!units(word).some(vowel)) return [];
    const out: WordStress = { word, syllables: 0, acutes: 0, dotted: false, acuteOnDotted: false };
    for (const unit of units(word)) {
      const letter = stripStress(unit, mark).toLowerCase();
      const acute = unit.includes(mark);
      const dotted = rules.restores?.[letter] !== undefined;
      if (rules.vowels.includes(letter)) out.syllables += 1;
      if (acute) out.acutes += 1;
      if (dotted) out.dotted = true;
      if (acute && dotted) out.acuteOnDotted = true;
    }
    return [out];
  });
}

/**
 * Whether a word of two or more syllables in the text has no stress shown, by an acute or by ё.
 * Never in a language that marks only its exceptions, since a bare word there is stressed as usual.
 */
export function missingStress(text: string, rules: StressRules): boolean {
  if (rules.marks === "exceptions") return false;
  return wordStress(text, rules).some(
    (word) => word.syllables > 1 && word.acutes === 0 && !word.dotted,
  );
}

/** Whether `after` is `before` with stress marks added, keeping every mark it had and changing nothing else. */
export function addsStress(before: string, after: string, mark = STRESS): boolean {
  if (stripStress(after, mark) !== stripStress(before, mark)) return false;
  const had = units(before);
  const has = units(after);
  if (had.length !== has.length) return false;
  let added = false;
  for (const [i, unit] of had.entries()) {
    const marked = (has[i] as string).includes(mark);
    if (unit.includes(mark) && !marked) return false;
    if (marked && !unit.includes(mark)) added = true;
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

/**
 * Text with an acute over a vowel the language never writes with one turned into its stress mark,
 * so múzyka typed with a Polish keyboard's acute becomes mùzyka while ó, a letter, stays.
 */
export function acuteStress(text: string, rules: StressRules): string {
  const vowels = rules.acuteVowels;
  if (!vowels || markOf(rules) === STRESS) return text;
  const out = text
    .normalize("NFD")
    .replace(/(\p{L})\u0301/gu, (found, letter: string) =>
      vowels.includes(letter.toLowerCase()) ? letter + markOf(rules) : found,
    );
  // Composed, so mùzyka stores one letter ù however it was typed.
  return out.normalize("NFC");
}

/** A run of a term as drawn with its stressed syllable underlined, and whether it is that syllable. */
export type StressSpan = { text: string; stressed: boolean };

/**
 * The term in runs, with each stressed syllable's onset and vowel as one stressed run, or null
 * where `markedForm` draws nothing. The onset is a word's whole opening cluster, else the one
 * consonant or digraph before the vowel with a softening i, so cztèrysta underlines czte and
 * zrobìłabym bi.
 */
export function stressSpans(
  term: string,
  pronunciation: string,
  rules: StressRules,
): StressSpan[] | null {
  const form = markedForm(term, pronunciation, rules);
  if (form === null) return null;
  const mark = markOf(rules);
  const chars = units(form).map((unit) => ({
    text: unit.replace(mark, "").normalize("NFC"),
    marked: unit.includes(mark),
  }));
  const lower = (at: number) => chars[at]?.text.toLowerCase() ?? "";
  const letter = (at: number) => /^\p{L}/u.test(chars[at]?.text ?? "");
  const consonant = (at: number) => letter(at) && !rules.vowels.includes(lower(at));
  const stressed = new Set<number>();
  for (const [vowel, char] of chars.entries()) {
    if (!char.marked) continue;
    let start = vowel;
    if (lower(start - 1) === "i" && consonant(start - 2)) start -= 1;
    let opening = start;
    while (consonant(opening - 1)) opening -= 1;
    if (!letter(opening - 1)) start = opening;
    else if (consonant(start - 1)) {
      start -= 1;
      if (rules.digraphs?.includes(lower(start - 1) + lower(start))) start -= 1;
    }
    for (let at = start; at <= vowel; at += 1) stressed.add(at);
  }
  const spans: StressSpan[] = [];
  for (const [at, char] of chars.entries()) {
    const last = spans.at(-1);
    if (last && last.stressed === stressed.has(at)) last.text += char.text;
    else spans.push({ text: char.text, stressed: stressed.has(at) });
  }
  return spans;
}
