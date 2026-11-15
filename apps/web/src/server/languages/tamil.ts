import { isTamilReading, sameTamilReading, tamilTermReading } from "@lymi/core/indic";
import type { LanguagePrompts } from "./types";

const TAMIL = /[அ-ஹ]/u;
const LATIN = /\p{Script=Latin}/u;

/** Whether Lymi draws a pronunciation over the term as it was written, word for word, so it reads as the word. */
export function drawnAsWritten(term: string, text: string): boolean {
  const words = text.normalize("NFC").trim().split(/\s+/u);
  const drawn = tamilTermReading(term, text)?.filter((segment) => segment.reading !== undefined);
  return !!drawn?.length && drawn.every((segment, i) => segment.reading === words[i]);
}

/**
 * Tamil: Lymi reads each word's spelling itself, so the model writes a reading only for a word not
 * said as spelled, and the spoken form in notes. docs/proposals/tamil.md.
 */
export const tamil = {
  tag: "ta",
  enrich: {
    guide: {
      example: "One short sentence in written Tamil, in Tamil script only, with no Latin letters.",
      notes:
        "Verb: the root, which is also the command, with the past and future, first person singular (*வா: வந்தேன் · வருவேன்*). Where everyday speech says the word differently from its written form, as it says *இருக்கிறது* as *இருக்கு*, end with the spoken form in Tamil script and its reading, which alone is reason enough to write notes: Spoken: *இருக்கு* (irukku). The spoken form never goes in pronunciation.",
    },
    example: `Tamil deck, no samples, meaningLanguage en. Card "பஸ்", mayFill: meaning, example, notes, pronunciation.
{"meaning": "bus", "example": "நான் பஸ்ஸில் போகிறேன்.", "notes": null, "pronunciation": "bas", "language": null}
Why: Lymi reads the spelling பஸ் as pas, but the word is said bas, so its reading goes in pronunciation. A word said as spelled, such as மரம், gets pronunciation null. The example is written Tamil in Tamil script.`,
  },
  lesson:
    "Latin letters beside or under the Tamil word, with or without marks (vaṇakkam, vanakkam)",
  hint: "Many everyday words are loans from English or Sanskrit (பஸ் bus, ஜன்னல் window); when the word is one, try that route first. Otherwise a sound-alike follows the word's sound, written in English letters. Never write Tamil script in the hook.",
  checks: [
    {
      field: "pronunciation",
      rule: "only for a word not said as spelled",
      pass: (text, card) => isTamilReading(text) && !sameTamilReading(card.term, text),
    },
    {
      field: "pronunciation",
      rule: "reads as the word",
      pass: (text, card) => drawnAsWritten(card.term, text),
    },
    {
      field: "example",
      rule: "Tamil script only",
      pass: (text) => TAMIL.test(text) && !LATIN.test(text),
    },
  ],
} as const satisfies LanguagePrompts;
