import type { LanguageSupport } from "./types";

/**
 * Polish: stress falls on the second-to-last syllable, so only a word that breaks the rule has a
 * pronunciation, the term with a grave over its stressed vowel (mùzyka), drawn as an underlined
 * syllable until the card is Known. A grave, because an acute over o is the letter ó.
 * docs/proposals/polish.md.
 */
export const polish = {
  tag: "pl",
  // Onest draws Polish letters.
  scripts: [],
  written: ["Latn"],
  engine: "stress",
  starts: ["notes"],
  stress: {
    vowels: "aąeęioóuy",
    mark: "\u0300",
    acuteVowels: "aeiuy",
    digraphs: ["ch", "cz", "dz", "dź", "dż", "rz", "sz"],
    marks: "exceptions",
    draw: "syllable",
  },
  pronunciation: "stress",
  format: {
    name: "Polish",
    pronunciation:
      "The term with a grave accent, as one composed letter (à, è, ì, ù, ỳ), over the stressed vowel of each word not stressed on its second-to-last syllable: words in -yka and -ika (mùzyka), first and second person plural past forms (bỳliśmy), conditional forms that add a syllable (zrobìłabym) and a few numerals (cztèrysta).",
    empty: "every word of the term has one syllable or is stressed on its second-to-last",
    never: "Not IPA, and never an acute, which turns o into the letter ó.",
    sample: { term: "muzyka", pronunciation: "mùzyka" },
    duplicates: "term-and-reading",
  },
  // Without the context, a voice may read a short Polish word with a neighbour's sounds, as Ukrainian voices did before PR #910.
  speech: { saysReading: false, leadIn: false, context: "Po polsku:" },
} as const satisfies LanguageSupport;
