import { testRule } from "../test/run.mjs";

const filename = "review-card.tsx";

testRule("term-text", {
  message:
    "A screen draws a term with TermText and an example with ExampleText from term-text.tsx, " +
    "which choose how the card's language draws its reading. Ask drawsTermReading(card) or " +
    "hasReadings(text, language) for layout.",
  valid: [
    { filename, code: "const a = drawsTermReading(card);" },
    { filename, code: "const b = reader.termReading(card.term);" },
    { filename, code: "const c = exampleSegments(example);" },
    { filename, code: "const d = termReading?.(card.term);" },
  ],
  invalid: [
    { filename, code: "const a = termReading(card.term);", errors: ["termReading(card.term)"] },
    { filename, code: "const b = parseReadings(text);", errors: ["parseReadings(text)"] },
    {
      filename,
      code: "const c = exampleSegments(card.example, card.language);",
      errors: ["exampleSegments(card.example, card.language)"],
    },
  ],
});
