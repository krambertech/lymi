import type { StressRules } from "../languages/types";

export const STRESS = "́";

const UNIT = /\P{M}\p{M}*/gu;

const units = (text: string) => text.normalize("NFD").match(UNIT) ?? [];

const clean = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");

export function stripStress(text: string): string {
  return text.normalize("NFD").replaceAll(STRESS, "").normalize("NFC");
}

export function hasStress(text: string): boolean {
  return text.normalize("NFD").includes(STRESS);
}

type Drawn = { text: string; vowel: boolean; restored: boolean; acute: boolean };

export function markedForm(term: string, pronunciation: string, rules: StressRules): string | null {
  const read = readStress(term, pronunciation, rules);
  return read && read.marks > 0 ? read.form : null;
}

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

const JOINER = /^[-\u2010\u2011'\u2018\u2019\u02BC`]$/u;

const APOSTROPHES = /[\u2018\u2019\u02BC`]/gu;

export function foldApostrophes(text: string): string {
  return text.replace(APOSTROPHES, "'");
}

const apostrophe = foldApostrophes;

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

export interface WordStress {
  word: string;
  syllables: number;
  acutes: number;
  dotted: boolean;
  acuteOnDotted: boolean;
}

const WORD = /[\p{L}\p{M}]+(?:[-\u2010\u2011'\u2018\u2019`][\p{L}\p{M}]+)*/gu;

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

export function missingStress(text: string, rules: StressRules): boolean {
  return wordStress(text, rules).some(
    (word) => word.syllables > 1 && word.acutes === 0 && !word.dotted,
  );
}

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

export function stressKey(term: string, pronunciation: string, rules: StressRules): string | null {
  const marked = markedForm(term, pronunciation, rules);
  return marked === null ? null : apostrophe(marked.toLowerCase());
}

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
