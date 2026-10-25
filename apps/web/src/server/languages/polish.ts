import { hasStress, LANGUAGE_RECORDS, markedForm, wordStress } from "@lymi/core";
import type { LanguageCheck, LanguagePrompts } from "./types";

const RULES = LANGUAGE_RECORDS.pl.stress;

/** One letter and the marks after it, in NFD, so ó stays one letter. */
const UNIT = /\P{M}\p{M}*/gu;

/**
 * Each syllable's vowel in a word, by the stress mark it carries: an i before another vowel only
 * softens the consonant before it, so nie and pianino count one syllable and three.
 */
function syllables(word: string): boolean[] {
  const units = word.normalize("NFD").match(UNIT) ?? [];
  const letter = (at: number) => (units[at] ?? "").replace(RULES.mark, "").normalize("NFC");
  const vowel = (at: number) => RULES.vowels.includes(letter(at).toLowerCase());
  return units.flatMap((unit, at) => {
    if (!vowel(at)) return [];
    const softening =
      letter(at).toLowerCase() === "i" &&
      !unit.includes(RULES.mark) &&
      vowel(at + 1) &&
      /\p{L}/u.test(letter(at - 1)) &&
      !vowel(at - 1);
    return softening ? [] : [unit.includes(RULES.mark)];
  });
}

/** Whether no word marks the stress Polish gives it anyway, on its second-to-last syllable or its only one. */
function marksOnlyExceptions(text: string): boolean {
  return (text.match(/[\p{L}\p{M}]+/gu) ?? []).every((word) => {
    const marks = syllables(word);
    const at = marks.indexOf(true);
    return at === -1 || (marks.length > 1 && at !== marks.length - 2);
  });
}

const CHECKS: readonly LanguageCheck[] = [
  {
    field: "pronunciation",
    rule: "the term with its stress marked",
    pass: (text, card) => markedForm(card.term, text, RULES) !== null,
  },
  {
    field: "pronunciation",
    rule: "one mark per word",
    pass: (text) => wordStress(text, RULES).every((word) => word.acutes <= 1),
  },
  { field: "pronunciation", rule: "a mark only where the rule breaks", pass: marksOnlyExceptions },
  { field: "example", rule: "no stress marks", pass: (text) => !hasStress(text, RULES.mark) },
];

/**
 * Polish: stress falls on the second-to-last syllable, so only a word that breaks the rule has a
 * pronunciation, the term with a grave over its stressed vowel, and examples stay as natives write
 * them. Notes warn a Ukrainian or Russian reader where Polish only looks like their language.
 * docs/proposals/polish.md.
 */
export const polish = {
  tag: "pl",
  enrich: {
    guide: {
      example:
        "One short sentence in Polish as natives write it, with no stress marks, not even on a word that breaks the stress rule: Wieczorem słucham muzyki.",
      notes:
        "Verb: Perfective: *zrobić* (or Imperfective: on a perfective term), Present: *robię, robisz* (a perfective: Future: *zrobię, zrobisz*). Noun: Gender where the ending hides it, Genitive where the stem changes (*pies, psa*), Plural where irregular or masculine-personal (Plural: *studenci*). Usage: the case a verb takes (+ genitive: *bać się psa*), or *na* against *w*. For a reader in Ukrainian or Russian, also a false friend, naming the look-alike and what it means (False friend: *sklep*, a shop, not склеп, a crypt), and a case or preposition that differs from theirs (*tęsknić za domem*, not по). Words that most often trick that reader: sklep, dynia, arbuz, owoce, magazyn, dywan, krzesło, czaszka, drużyna, pensja, plecy, łyżwy, recepta, zwyczajnie.",
    },
    example: `Polish deck, no samples, meaningLanguage uk. Card "sklep", mayFill: meaning, example, notes, pronunciation.
{"meaning": "магазин", "example": "Idę do sklepu po chleb.", "notes": "Хибний друг: *sklep* — магазин, а не склеп (польською *grobowiec*)", "pronunciation": null, "language": null}
Why: sklep is stressed on its second-to-last syllable, as nearly every Polish word is, so the pronunciation stays null; muzyka, stressed on its first, would get mùzyka. The note warns a Ukrainian reader off склеп in their own language. The example carries no marks.`,
  },
  lesson:
    "a grave or an acute over the stressed vowel of a word that breaks the stress rule (mùzyka, múzyka), or the term printed plain; never ó, which is a letter",
  hook: "Polish stresses the second-to-last syllable, unless the pronunciation marks another with a grave: make the stressed syllable the loud one in a sound-alike. A word that looks Ukrainian or Russian but means something else, such as sklep, a shop, must lead to the Polish meaning.",
  checks: CHECKS,
} as const satisfies LanguagePrompts;
