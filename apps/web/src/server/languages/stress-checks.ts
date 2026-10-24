import { addsStress, markedForm, missingStress, type StressRules, wordStress } from "@lymi/core";
import type { LanguageCheck } from "./types";

/**
 * The checks a language on the marks-in-place engine holds the AI's pronunciations and examples
 * to: the term with a mark on every word of two or more syllables, one mark a word, none on a
 * letter whose dots already mark its stress or on a word of one syllable, and a learner's example
 * changed only by its marks. `idle` names the last rule in the language's words.
 */
export function stressChecks(rules: StressRules, idle: string): readonly LanguageCheck[] {
  const oneMark = (text: string) => wordStress(text, rules).every((word) => word.acutes <= 1);
  const noIdleMark = (text: string) =>
    wordStress(text, rules).every(
      (word) => !word.acuteOnDotted && (word.syllables > 1 || word.acutes === 0),
    );
  return [
    {
      field: "pronunciation",
      rule: "the term with its stress marked",
      pass: (text, card) =>
        markedForm(card.term, text, rules) !== null && !missingStress(text, rules),
    },
    { field: "pronunciation", rule: "one mark per word", pass: oneMark },
    { field: "pronunciation", rule: idle, pass: noIdleMark },
    {
      field: "example",
      rule: "stress on every word of two or more syllables",
      pass: (text) => !missingStress(text, rules),
    },
    { field: "example", rule: "one mark per word", pass: oneMark },
    { field: "example", rule: idle, pass: noIdleMark },
    {
      field: "example",
      rule: "text unchanged under marks",
      pass: (text, card) => !card.example || addsStress(card.example, text),
    },
  ];
}
