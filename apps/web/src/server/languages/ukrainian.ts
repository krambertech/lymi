import { LANGUAGE_RECORDS } from "@lymi/core";
import { stressChecks } from "./stress-checks";
import type { LanguagePrompts } from "./types";

/**
 * Ukrainian: the term as natives write it, and the pronunciation and every example with U+0301
 * over each stressed vowel, so за́мок and замо́к are told apart, and a word that looks Russian is
 * read as Ukrainian. docs/proposals/russian-and-ukrainian.md.
 */
export const ukrainian = {
  tag: "uk",
  enrich: {
    guide: {
      example:
        "One short sentence in Ukrainian, never Russian, with U+0301 over the stressed vowel of each word of two or more syllables, as in the pronunciation, and none over a word of one syllable: Я живу́ в Ки́єві. Mark the stress of the form the sentence uses, which may move from the term's: рука́, but ру́ки. Check the words most often misstressed: мене́, тебе́, нема́є, допомо́га, удо́ма, дити́на, подя́кувати.",
      notes:
        "Mark stress on every form, as in the example. Verb: Perfective: *купи́ти* (or Imperfective: on a perfective term), Present: *купу́ю, купу́єш* (a perfective: Future: *куплю́, ку́пиш*). Noun: Gender where the ending hides it (*ніч*, Gender: feminine), and Plural or Genitive when irregular or the stress moves (Plural: *ру́ки*). Usage: the case or preposition a verb takes if it isn't the accusative (+ dative: *дя́кувати*), a word spelled the same with the stress elsewhere (*за́мок*, a castle), or a Russian look-alike (*неді́ля* is Sunday, not a week).",
    },
    example: `Ukrainian deck, no samples, meaningLanguage en. Card "замок", meaning "lock", mayFill: example, notes, pronunciation.
{"meaning": null, "example": "Ключ не підхо́дить до замка́.", "notes": "Stressed elsewhere: *за́мок*, a castle", "pronunciation": "замо́к", "language": null}
Why: the meaning says замок is a lock, замо́к, not a castle, за́мок. The example is Ukrainian and marks each word of two or more syllables as that form is said, замка́, and leaves ключ, не and до bare. A card with addReadings gets its own example back with marks added that way, with nothing else changed.`,
  },
  lesson:
    "an acute over the stressed vowel, in the term itself or beside it (молоко́), as Ukrainian textbooks print stress",
  hint: "The pronunciation's acute marks the stressed syllable, which carries the word: make that syllable the loud one in a sound-alike, since a hook stressed elsewhere teaches the wrong word. Many words share a root with an English loan (телефо́н, теа́тр); when one does, try that route first. A word that looks like a Russian one with another meaning, such as неді́ля, Sunday, must lead to the Ukrainian meaning.",
  checks: stressChecks(LANGUAGE_RECORDS.uk.stress, "no mark on one syllable"),
} as const satisfies LanguagePrompts;
