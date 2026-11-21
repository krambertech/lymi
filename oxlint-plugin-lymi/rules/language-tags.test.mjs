import { testRule } from "../test/run.mjs";

const filename = "cards.ts";

testRule("language-tags", {
  message:
    "Language behaviour comes from the card's tag through packages/core/src/languages, the one " +
    "place that compares language codes. Ask it, as in drawsReadings(tag) or " +
    "languageScript(tag), or add what you need to the record.",
  valid: [
    { filename, code: "const a = drawsReadings(tag);" },
    { filename, code: 'const b = language === "en";' },
    { filename, code: 'const c = card.language === "jav";' },
    { filename, code: "const d = lang === `ja`;" },
  ],
  invalid: [
    { filename, code: 'const a = card.language === "ja";', errors: ['card.language === "ja"'] },
    { filename, code: 'const b = "zh-Hant" !== lang;', errors: ['"zh-Hant" !== lang'] },
    { filename, code: 'const c = languageKey(tag) == "ja";', errors: ['languageKey(tag) == "ja"'] },
    {
      filename,
      code: 'switch (tag) {\n  case "ja":\n    run();\n    break;\n  case "en":\n    break;\n}',
      errors: ['case "ja":\n    run();\n    break;'],
    },
    { filename, code: 'const e = new Set(["ja", "ko"]);', errors: ['new Set(["ja", "ko"])'] },
    {
      filename,
      code: 'const f = ["ja", "zh"].includes(lang);',
      errors: ['["ja", "zh"].includes(lang)'],
    },
    {
      filename,
      code: 'const g = new Map([["zh", 1]]).has(lang);',
      errors: ['new Map([["zh", 1]]).has(lang)', 'new Map([["zh", 1]])'],
    },
    { filename, code: 'const h = foo(lang === "ja");', errors: ['lang === "ja"'] },
  ],
});
