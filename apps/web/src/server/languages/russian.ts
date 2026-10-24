import { addsStress, LANGUAGE_RECORDS, markedForm, missingStress, wordStress } from "@lymi/core";
import type { LanguagePrompts } from "./types";

const RULES = LANGUAGE_RECORDS.ru.stress;

/** Whether every word carries at most one acute. */
const oneMark = (text: string) => wordStress(text, RULES).every((word) => word.acutes <= 1);

/** Whether no acute stands over ё or over a word of one syllable, which carry no mark. */
const noIdleMark = (text: string) =>
  wordStress(text, RULES).every(
    (word) => !word.acuteOnDotted && (word.syllables > 1 || word.acutes === 0),
  );

/**
 * Russian: the term as natives write it, and the pronunciation and every example with U+0301
 * over each stressed vowel, so за́мок and замо́к are told apart. docs/proposals/russian-and-ukrainian.md.
 */
export const russian = {
  tag: "ru",
  enrich: {
    guide: {
      example:
        "One short sentence with U+0301 over the stressed vowel of each word of two or more syllables, as in the pronunciation, and none over ё or a word of one syllable: Я живу́ в Москве́. Mark the stress of the form the sentence uses, which may move from the term's: го́род, but в города́х.",
      notes:
        "Mark stress on every form, as in the example. Verb: Perfective: *сде́лать* (or Imperfective: on a perfective term), and a past or present form that shows the stress moving (Past: *жила́*). Noun: Gender where the ending doesn't show it (*ночь*, Gender: feminine), and Plural or Genitive plural when irregular or the stress moves (Plural: *города́*). Usage: the case or preposition a verb takes if it isn't the accusative (+ instrumental: *занима́ться*), or a word spelled the same with the stress elsewhere (*за́мок*, a castle).",
    },
    example: `Russian deck, no samples, meaningLanguage en. Card "замок", meaning "lock", mayFill: example, notes, pronunciation.
{"meaning": null, "example": "Ключ не подхо́дит к замку́.", "notes": "Stressed elsewhere: *за́мок*, a castle", "pronunciation": "замо́к", "language": null}
Why: the meaning says замок is a lock, замо́к, not a castle, за́мок. The example marks each word of two or more syllables as that form is said, замку́, and leaves ключ, не and к bare. A card with addReadings gets its own example back with marks added that way, with nothing else changed.`,
  },
  lesson:
    "an acute over the stressed vowel, in the term itself or beside it (молоко́), as Russian textbooks print stress",
  hook: "The pronunciation's acute marks the stressed syllable, which carries the word: make that syllable the loud one in a sound-alike, since a hook stressed elsewhere teaches the wrong word. Many words share a root with an English loan (телефо́н, теа́тр); when one does, try that route first.",
  checks: [
    {
      field: "pronunciation",
      rule: "the term with its stress marked",
      pass: (text, card) =>
        markedForm(card.term, text, RULES) !== null && !missingStress(text, RULES),
    },
    { field: "pronunciation", rule: "one mark per word", pass: oneMark },
    { field: "pronunciation", rule: "no mark on ё or one syllable", pass: noIdleMark },
    {
      field: "example",
      rule: "stress on every word of two or more syllables",
      pass: (text) => !missingStress(text, RULES),
    },
    { field: "example", rule: "one mark per word", pass: oneMark },
    { field: "example", rule: "no mark on ё or one syllable", pass: noIdleMark },
    {
      field: "example",
      rule: "text unchanged under marks",
      pass: (text, card) => !card.example || addsStress(card.example, text),
    },
  ],
} as const satisfies LanguagePrompts;
